import {EditorHeader} from './media-editor/editor-header';
import {MediaEditorGeneralSettings} from './media-editor/tabs/editor-general-settings';
import {createEffect, createSignal, onMount, Show, untrack} from 'solid-js';
import {MediaEditorPaintSettings} from './media-editor/tabs/editor-paint-settings';
import {MediaEditorTextSettings} from './media-editor/tabs/editor-text-settings';
import {MediaEditorCropSettings} from './media-editor/tabs/editor-crop-settings';
import {createStore, unwrap} from 'solid-js/store';
import {MediaEditorTabs} from './media-editor/editor-tabs';
import {MediaEditorStickersSettings} from './media-editor/tabs/editor-stickers-settings';
import rootScope from '../lib/rootScope';
import {MediaEditorStickersPanel} from './media-editor/media-panels/stickers-panel';
import {MediaEditorPaintPanel} from './media-editor/media-panels/paint-panel';
import {simplify} from './media-editor/math/draw.util';
import {Stroke} from './media-editor/math/algo';
import {
  calcCDT, createEnhanceFilterProgram,
  drawTextureDebug,
  drawTextureToNewFramebuffer,
  drawWideLineTriangle,
  executeEnhanceFilterToTexture,
  getGLFramebufferData,
  getHSVTexture, useProgram
} from './media-editor/glPrograms';
import {CropResizePanel} from './media-editor/media-panels/crop-resize-panel';
import Button from './button';
import {AddTextPanel} from './media-editor/media-panels/add-text-panel';
import {MediaEditorTextsPanel} from './media-editor/media-panels/text-panel';

export interface MediaEditorSettings {
  crop: number;
  angle: number;
  text: {
    color: number | string;
    align: number;
    outline: number;
    size: number;
    font: number;
  },
  paint: {
    size: number;
    tool: number;
    tools: (number | string)[]
  },
  filters: {
    enhance: number,
    brightness: number,
    contrast: number,
    saturation: number,
    warmth: number,
    fade: number,
    highlights: number,
    shadows: number,
    vignette: number,
    grain: number,
    sharpen: number,
    date: unknown // to track in createState
  }
}

const defaultEditorState = {
  crop: 0,
  angle: 0,
  text: {
    color: 0,
    align: 0,
    outline: 0,
    size: 24,
    font: 0
  },
  paint: {
    size: 15,
    tool: 0,
    tools: [0, 1, 2, 3]
  },
  filters: {
    enhance: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    fade: 0,
    highlights: 0,
    shadows: 0,
    vignette: 0,
    grain: 0,
    sharpen: 0,
    date: new Date()
  }
};

interface Point {
  x: number;
  y: number;
}

function getExtremumPoints(points: Point[]): Point[] {
  const minX = Math.min(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));

  const maxX = Math.max(...points.map(point => point.x));
  const maxY = Math.max(...points.map(point => point.y));

  const topLeft = {x: minX, y: minY};
  const bottomRight = {x: maxX, y: maxY};
  return [
    topLeft,
    // {x: topLeft.x, y: bottomRight.y},
    // {x: bottomRight.x, y: topLeft.y},
    bottomRight
  ]
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  // Convert angle to radians
  const radians = angle * (Math.PI / 180);

  // Translate point back to origin
  const translatedX = point.x - center.x;
  const translatedY = point.y - center.y;

  // Rotate point
  const rotatedX = translatedX * Math.cos(radians) - translatedY * Math.sin(radians);
  const rotatedY = translatedX * Math.sin(radians) + translatedY * Math.cos(radians);

  // Translate point back to original location
  const newX = rotatedX + center.x;
  const newY = rotatedY + center.y;

  return {x: newX, y: newY};
}

function rotateRectangle(rectangle: Point[], center: Point, angle: number): Point[] {
  return rectangle.map(point => rotatePoint(point, center, angle));
}

function getRectangleCenter(rectangle: Point[]): Point {
  if(rectangle.length !== 4) {
    throw new Error('Rectangle must have exactly 4 points');
  }

  const sum = rectangle.reduce(
    (acc, point) => {
      return {x: acc.x + point.x, y: acc.y + point.y};
    },
    {x: 0, y: 0}
  );

  const centerX = sum.x / 4;
  const centerY = sum.y / 4;

  return {x: centerX, y: centerY};
}

function scalePoint(point: Point, origin: Point, scale: number): Point {
  // Translate point to origin
  const translatedX = point.x - origin.x;
  const translatedY = point.y - origin.y;

  // Scale point
  const scaledX = translatedX * scale;
  const scaledY = translatedY * scale;

  // Translate point back
  const newX = scaledX + origin.x;
  const newY = scaledY + origin.y;

  return {x: newX, y: newY};
}

function scaleRectangle(rectangle: Point[], origin: Point, scale: number): Point[] {
  return rectangle.map(point => scalePoint(point, origin, scale));
}

const dup1 = (nestedArray: number[]) => {
  let out: any[] = [];
  const outs: any[][] = [];
  nestedArray.forEach(x => {
    out.push(x);
    if(out.length === 2) {
      outs.push([...out]);
      out = [];
    }
  });
  return outs;
}

type PropertyChange<T> = {
  prev: T;
  next: T;
}

type TextData = {
  media: 'text';
  text: string;
  color: number | string;
  align: number;
  outline: number;
  size: number;
  font: number;
}

type StickerData = {
  media: 'sticker';
  docId: any;
}

type MediaData = TextData | StickerData;

type UndoRedoUpdateAction = {
  type: 'update';
  mediaType: 'sticker' | 'text';
  id: string;
  x: PropertyChange<number>;
  y: PropertyChange<number>;
  rotation: PropertyChange<number>;
  scale: PropertyChange<number>;

  data?: PropertyChange<{
    text: string;
    color: number | string;
    align: number;
    outline: number;
    size: number;
    font: number;
  }>,
}

type UndoRedoMediaAction = {
  type: 'create' | 'delete';
  id: string;
  x: number;
  y: number
  rotation: number;
  scale: number;

  data: MediaData;
}

interface UndoRedoPaintAction {
  color: string;
  points: number[];
  size: number;
  tool: number;
}

type UndoRedoAction = {
  type: 'paint';
  action: UndoRedoPaintAction;
} | {
  type: 'media';
  action: UndoRedoMediaAction | UndoRedoUpdateAction;
};

export const AppMediaEditor = ({imageBlobUrl, close} : { imageBlobUrl: string, close: (() => void) }) => {
  const [tab, setTab] = createSignal(0);
  const cropResizeActive = () => tab() === 1;
  const [mediaEditorState, updateState] = createStore<MediaEditorSettings>(defaultEditorState);

  let sourceWidth = 0;
  let sourceHeight = 0;
  let glCanvas: HTMLCanvasElement;
  let gl:  WebGLRenderingContext;

  let originalTextureWithFilters: any = null;
  let currentTexture: any = null;

  let filterGLProgram: WebGLProgram;

  let container: HTMLDivElement;
  let mediaEditor: HTMLDivElement;
  let img: HTMLImageElement;
  const plz = new Image();

  const [globalPos, setGlobalPos] = createSignal([0, 0]);
  const [canvasSize, setCanvasSize] = createSignal([0, 0]);
  // crop area in real pixels of image
  const [cropArea, setCropArea] = createSignal([{x: 0, y: 0}, {x: 0, y:0}]);
  const [canvasScale, setCanvasScale] = createSignal(1);
  const [canvasPos, setCanvasPos] = createSignal([0, 0]);

  const cropScale = () => {
    const cropWidth = cropArea()[1].x - cropArea()[0].x;
    const cropHeight = cropArea()[1].y - cropArea()[0].y;
    const scaleX = container.clientWidth / cropWidth;
    const scaleY = container.clientHeight / cropHeight;
    return Math.min(scaleX, scaleY);
  };
  const viewCropOffset = () => {
    const cropWidth = cropArea()[1].x - cropArea()[0].x;
    const cropHeight = cropArea()[1].y - cropArea()[0].y;
    const scaledWidth = cropWidth * cropScale();
    const scaledHeight = cropHeight * cropScale();
    return [
      Math.max(0, container.clientWidth - scaledWidth),
      Math.max(0, container.clientHeight - scaledHeight)
    ];
  };
  const centerScaledCropOffset = () => {
    const x = cropArea()[0].x;
    const y = cropArea()[0].y;
    const [restX, restY] = viewCropOffset();
    return [x - restX / 2, y - restY / 2];
  }

  const drawTextureWithFilters = (img: any, sourceWidth: number, sourceHeight: number) => {
    console.info('redraw', mediaEditorState.filters.enhance);
    // get data from filters!!
    const hsvBuffer = getHSVTexture(gl, img, sourceWidth, sourceHeight);
    // calculate CDT Data
    const cdtBuffer = calcCDT(hsvBuffer, sourceWidth, sourceHeight);
    useProgram(gl, filterGLProgram);
    originalTextureWithFilters = executeEnhanceFilterToTexture(gl, filterGLProgram, sourceWidth, sourceHeight, hsvBuffer, cdtBuffer, enhanceProgram => {
      gl.uniform1f(gl.getUniformLocation(enhanceProgram, 'intensity'), (mediaEditorState.filters.enhance || 0) / 100);
    });
  }

  // filters start =========
  onMount(() => {
    const {left, top} = mediaEditor.getBoundingClientRect();
    setGlobalPos([left, top]);
    plz.src = 'assets/brush.png';

    img = new Image();
    img.src = imageBlobUrl;
    img.onload = async function() {
      const scaleX = img.width / container.clientWidth;
      const scaleY = img.height / container.clientHeight;
      const scale = Math.max(scaleX, scaleY);
      setCanvasSize([img.width / scale, img.height / scale]);
      glCanvas.width = img.width / scale;
      glCanvas.height = img.height / scale;

      setCropArea([
        {x: 0, y: 0},
        {x: img.width / scale, y: img.height / scale}
      ]);

      gl = glCanvas.getContext('webgl', {preserveDrawingBuffer: true});

      sourceWidth = img.width;
      sourceHeight = img.height;
      filterGLProgram = createEnhanceFilterProgram(gl);
      useProgram(gl, filterGLProgram);
      drawTextureWithFilters(this, sourceWidth, sourceHeight);
      currentTexture = originalTextureWithFilters;
      drawTextureDebug(gl, sourceWidth, sourceHeight, originalTextureWithFilters);
      return;
      /* const enhanceProgram = executeEnhanceFilter(gl, sourceWidth, sourceHeight, hsvBuffer, cdtBuffer);
      setFN(() => (int: number) => {
        gl.uniform1f(gl.getUniformLocation(enhanceProgram, 'intensity'), int);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      */
    };
  });

  const [fn, setFN] = createSignal((ebn: number) => { });
  createEffect(() => {
    const en = mediaEditorState.filters.enhance;
    console.info(en);

    if(fn()) {
      fn()(en / 100);
    }
  });

  // filter end ===========

  // rotate start =========
  const angle = () => mediaEditorState.angle;
  const croppedAreaRectangle = () => [
    {x: cropArea()[0].x, y: cropArea()[0].y},
    {x: cropArea()[0].x, y: cropArea()[1].y},
    {x: cropArea()[1].x, y: cropArea()[0].y},
    {x: cropArea()[1].x, y: cropArea()[1].y}
  ];
  const croppedAreaCenterPoint = () => getRectangleCenter(croppedAreaRectangle());

  createEffect(() => {
    if(angle() === 0) {
      setCanvasScale(1);
      setCanvasPos([0, 0]);
      return;
    }
    const rotatedRectangle = rotateRectangle(croppedAreaRectangle(), croppedAreaCenterPoint(), -angle());
    const [topLeft, bottomRight] = getExtremumPoints(rotatedRectangle);

    const rotatedBBWidth = bottomRight.x - topLeft.x;
    const rotatedBBHeight = bottomRight.y - topLeft.y;
    const scaleX = rotatedBBWidth / canvasSize()[0];
    const scaleY = rotatedBBHeight / canvasSize()[1];

    const scale = Math.max(scaleX, scaleY);
    const scaledRectangle = scale > 1 ?
      scaleRectangle(rotatedRectangle, getRectangleCenter(rotatedRectangle), 1 / scale) :
      rotatedRectangle;
    setCanvasScale(Math.max(1, scale));

    const [scaledTopLeft, scaledBottomRight] = getExtremumPoints(scaledRectangle);

    if(scaledTopLeft.x < 0 || scaledTopLeft.y < 0) {
      const moveX = scaledTopLeft.x > 0 ? 0 : Math.abs(scaledTopLeft.x);
      const moveY = scaledTopLeft.y > 0 ? 0 : Math.abs(scaledTopLeft.y);
      setCanvasPos([moveX, moveY]);
    } else if(scaledBottomRight.x > canvasSize()[0] || scaledBottomRight.y > canvasSize()[1]) {
      const moveX = scaledBottomRight.x < canvasSize()[0] ? 0 : -Math.abs(scaledBottomRight.x - canvasSize()[0]);
      const moveY = scaledBottomRight.y < canvasSize()[1] ? 0 : -Math.abs(scaledBottomRight.y - canvasSize()[1]);
      setCanvasPos([moveX, moveY]); // these probably should be set later on btw
    }
  });

  const mainCanvasCropResizeStyle = () => ({transform: `translate(${cropResizeActive() ? 10 : 0}%, ${cropResizeActive() ? 6.5 : 0}%) scale(${cropResizeActive() ? 0.8 : 1})`});
  const canvasSizeStyle = () => ({'max-width': `${canvasSize()[0]}px`, 'max-height': `${canvasSize()[1]}px`, 'width': '100%', 'height': '100%'});
  // rotate end =========

  // crop start =========
  const [currentHandlerDrag, setCurrentHandlerDrag] = createSignal<number>(null);
  const [initDragPos, setInitDragPos] = createSignal<[number, number]>([0, 0]);
  let parentSize = [0, 0];

  const [tempCropArea, setTempCropArea] = createSignal([]);
  createEffect(() => setTempCropArea(cropArea()));
  const handleDragStart = (ev: DragEvent, idx: number) => {
    setCurrentHandlerDrag(idx);
    const [x, y] = [ev.clientX, ev.clientY];
    const {width, height} = (ev.target as HTMLElement).parentElement.getBoundingClientRect();
    parentSize = [width, height];
    setInitDragPos([x, y]);
  }

  let skip = 0;
  let cropDebounce: any;
  const onDrag = (ev: DragEvent) => {
    skip += 1;
    if(skip < 25) {
      return;
    }
    skip = 0;
    const [cX, cY] = [ev.clientX, ev.clientY];
    const x = (cX - initDragPos()[0]);
    const y = (cY - initDragPos()[1]);
    const [width, height] = parentSize;
    const scaleX = x / (width); // percentage of how much we decrease the size
    const scaleY = y / (height);

    const cropWidth = cropArea()[1].x - cropArea()[0].x;
    const cropHeight = cropArea()[1].y - cropArea()[0].y;
    const cropX = scaleX * cropWidth;
    const cropY = scaleY * cropHeight;

    setTempCropArea(cropArea());
    if(currentHandlerDrag() === 0) {
      setTempCropArea(([topLeft, bottomRight]) => [{x: topLeft.x + cropX, y: topLeft.y + cropY}, bottomRight]);
    } else if(currentHandlerDrag() === 1) {
      setTempCropArea(([topLeft, bottomRight]) => [{x: topLeft.x, y: topLeft.y + cropY}, {x: bottomRight.x + cropX, y: bottomRight.y}]);
    } else if(currentHandlerDrag() === 2) {
      setTempCropArea(([topLeft, bottomRight]) => [{x: topLeft.x + cropX, y: topLeft.y}, {x: bottomRight.x, y: bottomRight.y + cropY}]);
    } else {
      setTempCropArea(([topLeft, bottomRight]) => [topLeft, {x: bottomRight.x + cropX, y: bottomRight.y + cropY}]);
    }
  }

  const handleDragEnd = () => {
    setCurrentHandlerDrag(null);
    parentSize = [0, 0];
    clearTimeout(cropDebounce);
    cropDebounce = setTimeout(() => {
      setCropArea(tempCropArea());
    }, 50);
  }

  // crop shapes
  createEffect(() => {
    const option = mediaEditorState.crop;
    if(option === 2) {
      setCropArea(([topLeft, bottomRight]) => {
        const cropWidth = bottomRight.x - topLeft.x;
        const cropHeight = bottomRight.y - topLeft.y;
        const squareSide = Math.min(cropWidth, cropHeight);
        return [
          {x: topLeft.x + (cropWidth - squareSide) / 2, y: topLeft.y + (cropHeight - squareSide) / 2},
          {x: topLeft.x + squareSide + (cropWidth - squareSide) / 2, y: topLeft.y + squareSide + (cropHeight - squareSide) / 2}
        ];
      });
    }
  });
  // crop end =========

  // paint start =========
  const linesSignal = createSignal<number[][]>([]);
  const [points, setPoints] = createSignal([]);
  const [lines2] = linesSignal;

  const updatePointPos = ({x, y}: Point): Point => {
    const viewCropOffsetUntracked = untrack(viewCropOffset);
    const canvasSizeUntracked = untrack(canvasSize);
    const cropAreaUntracked = untrack(cropArea);
    const pivot = untrack(croppedAreaCenterPoint);
    const untrackedAngle = untrack(angle);
    const untrackedCanvasPost = untrack(canvasPos);
    const untrackedCanvasScale = untrack(canvasScale);

    const drawCanvasWidth = container.clientWidth - viewCropOffsetUntracked[0];
    const drawCanvasHeight = container.clientHeight - viewCropOffsetUntracked[1];

    const scaleX = x / drawCanvasWidth;
    const scaleY = y / drawCanvasHeight;

    const cropWidth = cropAreaUntracked[1].x - cropAreaUntracked[0].x;
    const cropHeight = cropAreaUntracked[1].y - cropAreaUntracked[0].y;

    const justCropX = cropAreaUntracked[0].x + cropWidth * scaleX;
    const justCropY = cropAreaUntracked[0].y + cropHeight * scaleY;

    const rotatedPoint = rotatePoint({x: justCropX, y: justCropY}, pivot, untrackedAngle);
    const {x: scaledCropX, y: scaledCropY} = scalePoint(rotatedPoint, pivot, 1 / untrackedCanvasScale);

    const movedCropX = scaledCropX + untrackedCanvasPost[0];
    const movedCropY = scaledCropY + untrackedCanvasPost[1];
    return {
      x: movedCropX, // / canvasSizeUntracked[0],
      y: movedCropY // canvasSizeUntracked[1]
    };
  }

  // paint end ===========

  // undo redo start ======
  const [undoActions, setUndoActions] = createSignal<UndoRedoAction[]>([]);
  const [redoActions, setRedoActions] = createSignal<UndoRedoAction[]>([]);

  const undoActive = () => !!undoActions().length;
  const redoActive = () => !!redoActions().length;

  const addAction = (action: UndoRedoAction) => {
    executeAction(action, true);
    setUndoActions(undo => [...undo, action]);
    setRedoActions([]);
  }

  const undo = () => {
    if(!undoActions().length) {
      return;
    }
    const action = undoActions().at(-1);
    setUndoActions(actions => actions.slice(0, actions.length - 1));
    setRedoActions(actions => [...actions, action]);
    executeAction(action, false);
  }
  const redo = () => {
    if(!redoActions().length) {
      return;
    }
    const action = redoActions().at(-1);
    setRedoActions(actions => actions.slice(0, actions.length - 1));
    setUndoActions(actions => [...actions, action]);
    executeAction(action, true);
  }

  // undo redo end ========

  // media start
  let dragInitData: any = null;
  const startDragInitData = (val: any) => {
    dragInitData = val;
  }

  // stickers start ==========
  const [stickers, setStickers] = createSignal([]);
  const endStickerDrag = (id: string) => {
    // add action

    const sticker = stickers().find(st => st.id === id);
    const {x, y, rotation, scale} = dragInitData; // get data for text too
    addAction({
      type: 'media',
      action: {
        type: 'update',
        mediaType: 'sticker',
        id,
        x: {prev: x, next: sticker.x},
        y: {prev: y, next: sticker.y},
        rotation: {prev: rotation, next: sticker.rotation},
        scale: {prev: scale, next: sticker.scale}
        // set text prev next data
      }
    });
  }

  const endTextDrag = (id: string) => {
    // add action

    const text = texts().find(st => st.id === id);
    const {x, y, rotation, scale, data} = dragInitData; // get data for text too
    addAction({
      type: 'media',
      action: {
        type: 'update',
        mediaType: 'text',
        id,
        x: {prev: x, next: text.x},
        y: {prev: y, next: text.y},
        rotation: {prev: rotation, next: text.rotation},
        scale: {prev: scale, next: text.scale},
        data: {prev: data, next: text.data}
      }
    });
  }

  // text too bro
  const updateStickerPos = (id: string, x: number, y: number, rotation: number, scale: number) => {
    setStickers(list => list.map(sticker => sticker.id === id ? ({...sticker, x, y, rotation, scale}) : sticker));
  };

  const updateTextPos = (id: string, x: number, y: number, rotation: number, scale: number, data: any) => {
    setTexts(list => list.map(sticker => sticker.id === id ? ({...sticker, x, y, rotation, scale, ...data}) : sticker));
  };

  const stickerCLick = async(val: any, doc: any) => {
    const docId = await rootScope.managers.appDocsManager.getDoc(doc);
    if(!docId) {
      return;
    }
    const cropWidth = cropArea()[1].x - cropArea()[0].x;
    const cropHeight = cropArea()[1].y - cropArea()[0].y;
    addAction({
      type: 'media',
      action: {
        type: 'create',
        id: crypto.randomUUID(),
        x: cropArea()[0].x + (cropWidth / 2),
        y: cropArea()[0].y + (cropHeight / 2),
        rotation: angle(),
        scale: 1,
        data: {
          media: 'sticker',
          docId
        }
      }
    });
  }

  // stickers end ========

  // text start ========
  const [texts, setTexts] = createSignal([]);

  const createNewText = (text: string, data: {
    color: number | string;
    align: number;
    outline: number;
    size: number;
    font: number;
  }) => {
    const cropWidth = cropArea()[1].x - cropArea()[0].x;
    const cropHeight = cropArea()[1].y - cropArea()[0].y;
    addAction({
      type: 'media',
      action: {
        type: 'create',
        id: crypto.randomUUID(),
        x: cropArea()[0].x + (cropWidth / 2),
        y: cropArea()[0].y + (cropHeight / 2),
        rotation: angle(),
        scale: 1,
        data: {
          media: 'text',
          text,
          ...data
        }
      }
    });
  }

  // text end ==========

  // execution pipeline start =====
  const executeAction = (action: UndoRedoAction, forward: boolean) => {
    if(action.type === 'media') {
      const {id, type} = action.action;
      if(type === 'update') {
        const x = action.action.x[forward ? 'next' : 'prev'];
        const y = action.action.y[forward ? 'next' : 'prev'];
        const rotation = action.action.rotation[forward ? 'next' : 'prev'];
        const scale = action.action.scale[forward ? 'next' : 'prev'];

        if(action.action.mediaType === 'text') {
          const data = action.action.data[forward ? 'next' : 'prev'];
          console.info('exec action', action);
          updateTextPos(id, x, y, rotation, scale, data);
        } else {
          updateStickerPos(id, x, y, rotation, scale);
        }
      } else {
        const {data: {media, ...mediaData}, ...other} = action.action;
        if((type === 'create') === forward) {
          const fn = action.action.data.media === 'text' ? setTexts : setStickers;
          fn(prev => [...prev, {id, ...other, ...mediaData}]);
        } else {
          const fn = action.action.data.media === 'text' ? setTexts : setStickers;
          fn(prev => prev.filter(sticker => sticker.id !== id));
        }
      }
    } else {
      // paint
      if(forward) {
        // sets buffer as active
        drawTextureToNewFramebuffer(gl, sourceWidth, sourceHeight, currentTexture);
        drawWideLineTriangle(gl, sourceWidth, sourceHeight, action.action.points);
        const dat = getGLFramebufferData(gl, sourceWidth, sourceHeight);
        drawTextureDebug(gl, sourceWidth, sourceHeight, dat); // sets screen as active
        currentTexture = dat;
      } else {
        // draw form the beginning
        redrawAllUndo();
      }
    }
  }

  const redrawAllUndo = () => {
    const drawCommands = untrack(undoActions).filter(action => action.type === 'paint') as { type: 'paint', action: UndoRedoPaintAction }[];
    drawTextureWithFilters(img, sourceWidth, sourceHeight);
    currentTexture = originalTextureWithFilters;
    drawTextureToNewFramebuffer(gl, sourceWidth, sourceHeight, currentTexture);
    drawCommands.forEach(command => {
      drawWideLineTriangle(gl, sourceWidth, sourceHeight, command.action.points);
    });
    const dat = getGLFramebufferData(gl, sourceWidth, sourceHeight);
    drawTextureDebug(gl, sourceWidth, sourceHeight, dat); // sets screen as active
    currentTexture = dat;
  }
  // execution pipeline end =====

  createEffect(() => {
    const trackedPoints = points();
    if(!gl) {
      return;
    }
    const canvasSizeUntracked = untrack(canvasSize);
    const llld = dup1(trackedPoints);
    const lll = simplify(llld, 2);
    const stroke = Stroke({
      thickness: 25,
      join: 'bevel',
      miterLimit: 5
    });

    const {positions, cells} = stroke.build(lll) as { cells: [number, number, number][], positions: [number, number][] };
    const fin = [].concat(...[].concat(...cells).map(cell => {
      const [x1, y1] = positions[cell];
      let {x, y} = updatePointPos({x: x1, y: y1});
      x = x / canvasSizeUntracked[0];
      y = y / canvasSizeUntracked[1];
      return [2 * x - 1, 2 * y];
    }));

    drawTextureToNewFramebuffer(gl, sourceWidth, sourceHeight, currentTexture);
    drawWideLineTriangle(gl, sourceWidth, sourceHeight, fin);
    const dat = getGLFramebufferData(gl, sourceWidth, sourceHeight);
    drawTextureDebug(gl, sourceWidth, sourceHeight, dat);
  });

  // converts added lines to draw action
  createEffect((lines22: number[][]) => {
    if(lines2().length < lines22.length) {
      return lines2();
    }
    const newLines = lines2().slice(lines22.length);
    const canvasSizeUntracked = untrack(canvasSize);

    // should be one only
    newLines.forEach(ppp => {
      const llld = dup1(ppp);
      const lll = simplify(llld, 2);
      const stroke = Stroke({
        thickness: 25,
        join: 'bevel',
        miterLimit: 5
      });
      const {positions, cells} = stroke.build(lll) as { cells: [number, number, number][], positions: [number, number][] };
      const fin = [].concat(...[].concat(...cells).map(cell => {
        const [x1, y1] = positions[cell];
        let {x, y} = updatePointPos({x: x1, y: y1});
        x /= canvasSizeUntracked[0];
        y /= canvasSizeUntracked[1];
        return [2 * x - 1, 2 * y];
      }));
      addAction({
        type: 'paint',
        action: {
          color: '#aadd11',
          points: fin,
          size: 25,
          tool: 0
        }
      });
    });
    return lines2();
  }, lines2());

  const testExport = () => {
    // generateFakeGif(img);
    const cropWidth = cropArea()[1].x - cropArea()[0].x;
    const cropHeight = cropArea()[1].y - cropArea()[0].y;

    const bgImage = document.createElement('canvas');
    bgImage.width = cropWidth;
    bgImage.height = cropHeight;
    const bgCtx = bgImage.getContext('2d');
    bgCtx.fillStyle = 'black';
    bgCtx.fillRect(0, 0, cropWidth, cropHeight);
    bgCtx.drawImage(glCanvas, 0, 0);

    // rotate and scale if sticker is rotated and scaled
    const stickerCanvas = document.body.lastElementChild.previousElementSibling; // .getElementsByTagName('canvas').item(0);
    console.info(stickerCanvas);
    bgCtx.drawImage(stickerCanvas as any, 0, 0, 400, 400, 100, 100, 200, 200);

    // transformation
    const destinationCanvas = document.createElement('canvas');
    destinationCanvas.classList.add('test-exp');
    destinationCanvas.width = cropWidth;
    destinationCanvas.height = cropHeight;

    document.body.append(destinationCanvas);
    const destinationCtx = destinationCanvas.getContext('2d');

    const pivot = croppedAreaCenterPoint();
    const pivotOffset = [pivot.x, pivot.y]; // [pivot.x - cropArea()[0].x, pivot.y - cropArea()[0].y];
    const degree = -angle();
    // move to make crop
    destinationCtx.translate(-cropArea()[0].x, -cropArea()[0].y);
    // go to center of crop (but relatively for the whole canvas), rotate and go back
    destinationCtx.translate(pivotOffset[0], pivotOffset[1]);
    destinationCtx.rotate(degree * Math.PI / 180);
    // scale while you at the point
    destinationCtx.scale(canvasScale(), canvasScale());
    destinationCtx.translate(-pivotOffset[0], -pivotOffset[1]);
    // translate by canvas pos
    destinationCtx.translate(-canvasPos()[0], -canvasPos()[1]);
    destinationCtx.drawImage(bgImage, 0, 0);
  }

  const saveButton = Button('btn-circle btn-corner', {icon: 'check'});
  saveButton.onclick = () => testExport();

  // text editing
  const editingTextSignal = createSignal(false);
  const [editingText, setEditingText] = editingTextSignal;

  createEffect(() => {
    if(tab() === 2) {
      setEditingText(true); // or the selected text
    } else {
      setEditingText(false);
    }
  });

  const startEditText = (id: string) => {
    const textElem = texts().find(st => st.id === id);
    const {color, align, outline, size, font, text} = textElem;
    updateState('text', {color, align, outline, size, font});
    dragInitData = {x: textElem.x, y: textElem.y, rotation: textElem.rotation, scale: textElem.scale, data: {color, align, outline, size, font, text}};
    setEditingText(texts().find(st => st.id === id));
  }

  const finishEditText = (newText: string, newData: {
    color: number | string;
    align: number;
    outline: number;
    size: number;
    font: number;
  }) => {
    const text = editingText() as any;
    const {x, y, rotation, scale, data} = dragInitData;
    addAction({
      type: 'media',
      action: {
        type: 'update',
        mediaType: 'text',
        id: text.id,
        x: {prev: x, next: x},
        y: {prev: y, next: y},
        rotation: {prev: rotation, next: rotation},
        scale: {prev: scale, next: scale},
        data: {prev: data, next: {
          text: newText,
          ...newData
        }}
      }
    });
  };

  // ext edit end ======

  createEffect(() => {
    mediaEditorState.filters.date; // triggers the effect
    redrawAllUndo();
  })

  return <div class='media-editor' onClick={() => close()}>
    <div ref={mediaEditor} class='media-editor__container' onClick={ev => ev.stopImmediatePropagation()}>
      <div ref={container} class='media-editor__main-area'>
        <div class='main-canvas-container' style={mainCanvasCropResizeStyle()}>
          <div class='center-crop-area' style={{...canvasSizeStyle(), transform: `translate(${-centerScaledCropOffset()[0]}px, ${-centerScaledCropOffset()[1]}px)`}}>
            <div class='canvas-view-helper' style={{'transform-origin': `${cropArea()[0].x}px ${cropArea()[0].y}px`, 'transform': `scale(${cropScale()})`}}>
              <div class='canvas-elem' style={{
                ...canvasSizeStyle(),
                transform: `translate(${-canvasPos()[0]}px, ${-canvasPos()[1]}px)`,
                filter: cropResizeActive() ? 'brightness(50%)' : 'none'
              }}>
                <div style={{
                  ...canvasSizeStyle(),
                  'transform': `rotate(${-angle()}deg) scale(${canvasScale()})`,
                  'transform-origin': `${croppedAreaCenterPoint().x + canvasPos()[0]}px ${croppedAreaCenterPoint().y + canvasPos()[1]}px`
                }}>
                  <canvas class='main-canvas' ref={glCanvas} />
                  <MediaEditorStickersPanel active={tab() === 4}
                    startDrag={startDragInitData}
                    endDrag={endStickerDrag}
                    upd={updatePointPos}
                    stickers={stickers()}
                    updatePos={updateStickerPos}
                    crop={cropArea() as [Point, Point]}
                    top={globalPos()[1] + viewCropOffset()[1] / 2}
                    left={globalPos()[0] + viewCropOffset()[0] / 2}
                    width={container.clientWidth - viewCropOffset()[0]}
                    height={container.clientHeight - viewCropOffset()[1]}
                  />
                  <MediaEditorTextsPanel active={tab() === 2}
                    startDrag={startDragInitData}
                    endDrag={endTextDrag}
                    upd={updatePointPos}
                    stickers={texts()}
                    editText={startEditText}
                    updatePos={updateTextPos}
                    crop={cropArea() as [Point, Point]}
                    top={globalPos()[1] + viewCropOffset()[1] / 2}
                    left={globalPos()[0] + viewCropOffset()[0] / 2}
                    width={container.clientWidth - viewCropOffset()[0]}
                    height={container.clientHeight - viewCropOffset()[1]}
                  />
                </div>
              </div>
              <div class='cropped-view-area' style={{
                'pointer-events': cropResizeActive() ? 'auto' : 'none',
                'opacity': +cropResizeActive(),
                'top': `${cropArea()[0].y}px`,
                'left': `${cropArea()[0].x}px`,
                'width': '100%', 'height': '100%',
                'max-height': `${(cropArea()[1].y - cropArea()[0].y)}px`,
                'max-width': `${(cropArea()[1].x - cropArea()[0].x)}px`
              }}></div>
              <div class='canvas-crop-handlers'
                onDragEnter={onDrag}
                onDragOver={onDrag}
                style={{
                  'pointer-events': cropResizeActive() ? 'auto' : 'none',
                  'opacity': +cropResizeActive(),
                  'top': `${tempCropArea()[0].y}px`,
                  'left': `${tempCropArea()[0].x}px`,
                  'width': '100%', 'height': '100%',
                  'max-height': `${(tempCropArea()[1].y - tempCropArea()[0].y)}px`,
                  'max-width': `${(tempCropArea()[1].x - tempCropArea()[0].x)}px`
                }}
              >
                <div draggable={true} onDragStart={ev => handleDragStart(ev, 0)} onDragEnd={handleDragEnd} class='crop-handle top left'></div>
                <div draggable={true} onDragStart={ev => handleDragStart(ev, 1)} onDragEnd={handleDragEnd} class='crop-handle top right'></div>
                <div draggable={true} onDragStart={ev => handleDragStart(ev, 2)} onDragEnd={handleDragEnd} class='crop-handle bottom left'></div>
                <div draggable={true} onDragStart={ev => handleDragStart(ev, 3)} onDragEnd={handleDragEnd} class='crop-handle bottom right'></div>
              </div>
            </div>
          </div>
          <div class='canvas-hider' style={{left: '-1000px', top: '-1000px', bottom: '-1000px', width: `calc(1000px + ${viewCropOffset()[0] / 2}px)`, opacity: +!cropResizeActive()}}></div>
          <div class='canvas-hider' style={{right: '-1000px', top: '-1000px', bottom: '-1000px', width: `calc(1000px + ${viewCropOffset()[0] / 2}px)`, opacity: +!cropResizeActive()}}></div>
          <div class='canvas-hider' style={{left: '-1000px', right: '-1000px', bottom: '-1000px', height: `calc(1000px + ${viewCropOffset()[1] / 2}px)`, opacity: +!cropResizeActive()}}></div>
          <div class='canvas-hider' style={{left: '-1000px', right: '-1000px', top: '-1000px', height: `calc(1000px + ${viewCropOffset()[1] / 2}px)`, opacity: +!cropResizeActive()}}></div>
        </div>
        <CropResizePanel state={mediaEditorState.angle} updateState={updateState} active={cropResizeActive()} />
        <MediaEditorPaintPanel
          setPoints={setPoints}
          crop={cropArea() as [Point, Point]}
          top={viewCropOffset()[1] / 2}
          left={viewCropOffset()[0] / 2}
          width={container.clientWidth - viewCropOffset()[0]}
          height={container.clientHeight - viewCropOffset()[1]}
          linesSignal={linesSignal} active={tab() === 3} state={mediaEditorState.paint} />
        <Show when={tab() === 2 && editingText()}>
          <AddTextPanel finishEditText={finishEditText}
            createNewText={createNewText}
            state={mediaEditorState.text}
            editingText={editingTextSignal} />
        </Show>
      </div>
      <div class='media-editor__settings'>
        <EditorHeader undoActive={undoActive()} redoActive={redoActive()} undo={undo} redo={redo} close={close} />
        { saveButton }
        <MediaEditorTabs tab={tab()} setTab={setTab} tabs={[
          <MediaEditorGeneralSettings state={mediaEditorState.filters} updateState={updateState} />,
          <MediaEditorCropSettings crop={mediaEditorState.crop} setCrop={val => updateState('crop', val)} />,
          <MediaEditorTextSettings state={mediaEditorState.text} updateState={updateState} />,
          <MediaEditorPaintSettings state={mediaEditorState.paint} updateState={updateState} />,
          <MediaEditorStickersSettings stickerCLick={stickerCLick} />
        ]} />
      </div>
    </div>
  </div>
}
