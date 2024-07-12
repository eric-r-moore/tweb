import {fragmentShaderSource, rgbToHsvFragmentShaderCode, vertexShaderSource, vertexShaderSourceFlip} from './shaders';
import {MediaEditorSettings} from '../appMediaEditor';
import {Setter, Signal} from 'solid-js';

const PGPhotoEnhanceSegments = 4; // Example value, replace with actual value
const PGPhotoEnhanceHistogramBins = 256; // Example value, replace with actual value

export function calcCDT(hsvBuffer: Uint8Array, width: number, height: number) {
  const buffer = new Uint8Array(PGPhotoEnhanceSegments * PGPhotoEnhanceSegments * PGPhotoEnhanceHistogramBins * 4);
  const imageWidth = width;
  const imageHeight = height;
  const _clipLimit = 1.25;

  const totalSegments = PGPhotoEnhanceSegments * PGPhotoEnhanceSegments;
  const tileArea = Math.floor(imageWidth / PGPhotoEnhanceSegments) * Math.floor(imageHeight / PGPhotoEnhanceSegments);
  const clipLimit = Math.max(1.0, _clipLimit * tileArea / PGPhotoEnhanceHistogramBins);
  const scale = 255.0 / tileArea;

  const hist = Array.from({length: totalSegments}, () => new Uint32Array(PGPhotoEnhanceHistogramBins));
  const cdfs = Array.from({length: totalSegments}, () => new Uint32Array(PGPhotoEnhanceHistogramBins));
  const cdfsMin = new Uint32Array(totalSegments);
  const cdfsMax = new Uint32Array(totalSegments);

  const xMul = PGPhotoEnhanceSegments / imageWidth;
  const yMul = PGPhotoEnhanceSegments / imageHeight;

  for(let y = 0; y < imageHeight; y++) {
    const yOffset = y * width * 4;
    for(let x = 0; x < imageWidth; x++) {
      const index = x * 4 + yOffset;
      const tx = Math.floor(x * xMul);
      const ty = Math.floor(y * yMul);
      const t = ty * PGPhotoEnhanceSegments + tx;
      hist[t][hsvBuffer[index + 2]]++;
    }
  }

  for(let i = 0; i < totalSegments; i++) {
    if(clipLimit > 0) {
      let clipped = 0;
      for(let j = 0; j < PGPhotoEnhanceHistogramBins; j++) {
        if(hist[i][j] > clipLimit) {
          clipped += hist[i][j] - clipLimit;
          hist[i][j] = clipLimit;
        }
      }

      const redistBatch = Math.floor(clipped / PGPhotoEnhanceHistogramBins);
      const residual = clipped - redistBatch * PGPhotoEnhanceHistogramBins;

      for(let j = 0; j < PGPhotoEnhanceHistogramBins; j++) {
        hist[i][j] += redistBatch;
      }

      for(let j = 0; j < residual; j++) {
        hist[i][j]++;
      }
    }

    cdfs[i].set(hist[i]);

    let hMin = PGPhotoEnhanceHistogramBins - 1;
    for(let j = 0; j < PGPhotoEnhanceHistogramBins; j++) {
      if(cdfs[i][j] !== 0) {
        hMin = j;
        break;
      }
    }

    let cdf = 0;
    for(let j = hMin; j < PGPhotoEnhanceHistogramBins; j++) {
      cdf += cdfs[i][j];
      cdfs[i][j] = Math.min(255.0, cdf * scale);
    }

    cdfsMin[i] = cdfs[i][hMin];
    cdfsMax[i] = cdfs[i][PGPhotoEnhanceHistogramBins - 1];
  }

  const resultBytesPerRow = 4 * PGPhotoEnhanceHistogramBins;

  for(let tile = 0; tile < totalSegments; tile++) {
    const yOffset = tile * resultBytesPerRow;
    for(let i = 0; i < PGPhotoEnhanceHistogramBins; i++) {
      const index = i * 4 + yOffset;
      buffer[index] = cdfs[tile][i];
      buffer[index + 1] = cdfsMin[tile];
      buffer[index + 2] = cdfsMax[tile];
      buffer[index + 3] = 255;
    }
  }

  return buffer;
}

export const compileShader = (gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export const createAndUseGLProgram = (gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram | null => {
  const vertexShader = compileShader(gl, vertex, gl.VERTEX_SHADER);
  if(!vertexShader) return null;
  const fragmentShader = compileShader(gl, fragment, gl.FRAGMENT_SHADER);
  if(!fragmentShader) return null;
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  } else {
    gl.useProgram(shaderProgram);
    return shaderProgram;
  }
}

export const createGLTexture = (gl: WebGLRenderingContext) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

export const createTextureFromImage = (gl: WebGLRenderingContext, image: TexImageSource) => {
  const texture = createGLTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return texture;
}


export const createTextureFromData = (gl: WebGLRenderingContext, width: number, height: number, buffer: ArrayBufferView) => {
  const texture = createGLTexture(gl);
  gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
  return texture;
}

export const positionCoordinates = [
  -1.0,  1.0,
  1.0,  1.0,
  -1.0, -1.0,
  1.0, -1.0
];

export const textureCoordinates = [
  0.0,  1.0,
  1.0,  1.0,
  0.0,  0.0,
  1.0,  0.0
];

export const createGLBuffer = (gl: WebGLRenderingContext, source: BufferSource) => {
  const dataPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dataPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, source, gl.STATIC_DRAW);
  return dataPositionBuffer;
}

export const bindBufferToAttribute = (gl: WebGLRenderingContext, shaderProgram: WebGLProgram, attributeName: string, buffer: WebGLBuffer) => {
  const attribPosition = gl.getAttribLocation(shaderProgram, attributeName);
  gl.enableVertexAttribArray(attribPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(attribPosition, 2, gl.FLOAT, false, 0, 0);
}

export const createAndBindBufferToAttribute = (gl: WebGLRenderingContext, shaderProgram: WebGLProgram, attributeName: string, source: BufferSource): WebGLBuffer => {
  const glBuffer = createGLBuffer(gl, source);
  bindBufferToAttribute(gl, shaderProgram, attributeName, glBuffer);
  return glBuffer;
}

export const getHSVTexture = (gl: WebGLRenderingContext, image: TexImageSource, width: number, height: number): Uint8Array => {
  const dataShaderProgram = createAndUseGLProgram(gl, vertexShaderSource, rgbToHsvFragmentShaderCode);
  const dataTexture = createTextureFromImage(gl, image);
  const targetTexture = createTextureFromData(gl, width, height, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);
  createAndBindBufferToAttribute(gl, dataShaderProgram, 'aVertexPosition', new Float32Array(positionCoordinates));
  createAndBindBufferToAttribute(gl, dataShaderProgram, 'aTextureCoord', new Float32Array(textureCoordinates));
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dataTexture);
  gl.uniform1i(gl.getUniformLocation(dataShaderProgram, 'sTexture'), 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const hsvBuffer = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, hsvBuffer);
  return hsvBuffer;
}

export const executeEnhanceFilter = (gl: WebGLRenderingContext, width: number, height: number, hsvBuffer: ArrayBufferView, cdtBuffer: ArrayBufferView) => {
  const shaderProgram = createAndUseGLProgram(gl, vertexShaderSourceFlip, fragmentShaderSource);
  const cdtTexture = createTextureFromData(gl, 256, 16, cdtBuffer);
  const hsvSourceTexture = createTextureFromData(gl, width, height, hsvBuffer);
  createAndBindBufferToAttribute(gl, shaderProgram, 'aVertexPosition', new Float32Array(positionCoordinates));
  createAndBindBufferToAttribute(gl, shaderProgram, 'aTextureCoord', new Float32Array(textureCoordinates));

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, hsvSourceTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, 'sTexture'), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, cdtTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, 'inputImageTexture2'), 1);
  gl.uniform1f(gl.getUniformLocation(shaderProgram, 'intensity'), 0); // Adjust intensity as needed
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return shaderProgram;
}

export type Updater<T> = (v: T) => void;
type SignalFn<T> = (fn: (v: T) => T) => void
export const genStateUpdater = <T extends { }, K extends keyof T>(signal: SignalFn<T>, key: K) => {
  return (value: T[K]) => signal((prev: T) => ({...prev, [key]: value}));
}

