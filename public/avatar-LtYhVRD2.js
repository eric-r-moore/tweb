import{B as _,I as M,r as se}from"./button-yzvi0BQv.js";import{o as ne,L as oe,t as ae,C as N,m as re}from"./wrapEmojiText-WEOtSS7R.js";import{af as q,M as ce,c as X,as as le,g as Y,F as z,ah as he,a as de,ai as K,E as ue,ag as A,d as $,a8 as pe,i as U}from"./index-qSlrZUPB.js";import{a as L,d as fe}from"./page-CJ_86FDg.js";import{S as me}from"./scrollable-1qonJR7t.js";function ve(n){return q&&n instanceof TouchEvent&&n.touches[0].clientX<30}class ge{constructor(){if(this.onPopState=e=>{const t=window.location.hash,i=e.state;if(this.debug&&this.log("popstate",e,this.isPossibleSwipe,t),t!==this.currentHash)if(this.debug&&this.log.warn(`hash changed, new=${t}, current=${this.currentHash}, overridden=${this.overriddenHash}`),i===this.id&&this.overriddenHash&&this.overriddenHash!==t)this.overrideHash(this.overriddenHash);else if(i&&!this.overriddenHash&&t)this.overrideHash();else{this.currentHash=t,this.onHashChange&&this.onHashChange();return}if(i!==this.id&&(this.pushState(),!this.navigations.length))return;const s=this.navigations.pop();if(!s){this.pushState();return}this.manual=!this.isPossibleSwipe,this.handleItem(s,this.navigations.length)},this.onKeyDown=e=>{const t=this.navigations[this.navigations.length-1];t&&e.key==="Escape"&&(!t.onEscape||t.onEscape())&&(X(e),this.back(t.type))},this.onTouchStart=e=>{e.touches.length>1||(this.debug&&this.log("touchstart"),ve(e)&&(this.isPossibleSwipe=!0,window.addEventListener("touchend",()=>{setTimeout(()=>{this.isPossibleSwipe=!1},100)},{passive:!0,once:!0})))},this.navigations=[],this.id=Date.now(),this.manual=!1,this.log=le("NC"),this.debug=!0,this.currentHash=window.location.hash,this.overriddenHash="",this.isPossibleSwipe=!1,window.addEventListener("popstate",this.onPopState),window.addEventListener("keydown",this.onKeyDown,{capture:!0,passive:!1}),q){const e={passive:!0};window.addEventListener("touchstart",this.onTouchStart,e)}history.scrollRestoration="manual",this.pushState()}overrideHash(e=""){e&&e[0]!=="#"?e="#"+e:e==="#"&&(e=""),this.currentHash!==e&&(this.overriddenHash=this.currentHash=e,this.replaceState(),this.pushState())}handleItem(e,t=this.navigations.indexOf(e)){const i=e.onPop(this.manual?void 0:!1);this.debug&&this.log("popstate, navigation:",e,this.navigations),i===!1?this.spliceItems(Math.min(this.navigations.length,t),0,e):e.noBlurOnPop||Y(),this.manual=!1}findItemByType(e){for(let t=this.navigations.length-1;t>=0;--t){const i=this.navigations[t];if(i.type===e)return{item:i,index:t}}}back(e){if(e){const t=this.findItemByType(e);if(t){this.backByItem(t.item,t.index);return}}history.back()}backByItem(e,t=this.navigations.indexOf(e)){t!==-1&&(this.manual=!0,this.navigations.splice(t,1),this.handleItem(e,t))}onItemAdded(e){this.debug&&this.log("onItemAdded",e,this.navigations),e.noHistory||this.pushState()}pushItem(e){this.navigations.push(e),this.onItemAdded(e)}unshiftItem(e){this.navigations.unshift(e),this.onItemAdded(e)}spliceItems(e,t,...i){this.navigations.splice(e,t,...i),i.forEach(s=>{this.onItemAdded(s)})}pushState(){this.debug&&this.log("push"),this.manual=!1,history.pushState(this.id,"")}replaceState(){this.debug&&this.log.warn("replace");const e=location.origin+location.pathname+location.search+this.overriddenHash;history.replaceState(this.id,"",e)}removeItem(e){e&&z(this.navigations,e)}removeByType(e,t=!1){for(let i=this.navigations.length-1;i>=0&&!(this.navigations[i].type===e&&(this.navigations.splice(i,1),t));--i);}}const w=new ge;ce.appNavigationController=w;function be(n){if(n.key==="Enter"&&!he&&!n.isComposing){if(de.settings.sendShortcut==="enter")return n.shiftKey||n.ctrlKey||n.metaKey?void 0:!0;{const e=K?n.metaKey:n.ctrlKey;if(n.shiftKey||(K?n.ctrlKey:n.metaKey))return;if(e)return!0}}return!1}function Ae(n){n.requestFullscreen?n.requestFullscreen():n.mozRequestFullScreen?n.mozRequestFullScreen():n.webkitRequestFullscreen?n.webkitRequestFullscreen():n.msRequestFullscreen&&n.msRequestFullscreen()}function Oe(){document.cancelFullScreen?document.cancelFullScreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.webkitCancelFullScreen?document.webkitCancelFullScreen():document.msExitFullscreen&&document.msExitFullscreen()}function ye(n,e,t){const i=t?t.add(n):n.addEventListener.bind(n);"webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange".split(" ").forEach(s=>{i(s,e,!1)})}function j(){return document.fullscreenElement||document.mozFullScreenElement||document.webkitFullscreenElement||document.msFullscreenElement}function Fe(){return!!j()}const Ce=(n,e={})=>{const t=n?.split(" ");return _("btn-icon"+(t?.length>1?" "+t.slice(1).join(" "):""),{icon:t?.[0]||void 0,...e})},O=document.body;let C=O;const G=()=>{C=j()||O,P.reAppend()};ye(O,G);const p=class p extends ue{constructor(e,t={}){if(super(!1),this.element=document.createElement("div"),this.container=document.createElement("div"),this.header=document.createElement("div"),this.title=document.createElement("div"),this.element.classList.add("popup"),this.element.className="popup"+(e?" "+e:""),this.container.classList.add("popup-container","z-depth-1"),A.isDarkOverlayActive&&(this.night=!0,this.element.classList.add("night")),this.header.classList.add("popup-header"),t.title&&(this.title.classList.add("popup-title"),typeof t.title=="string"?$(this.title,t.title):typeof t.title!="boolean"&&this.title.append(t.title),this.header.append(this.title)),this.isConfirmationNeededOnClose=t.isConfirmationNeededOnClose,this.middlewareHelper=ne(),this.listenerSetter=new oe,this.managers=p.MANAGERS,this.confirmShortcutIsSendShortcut=t.confirmShortcutIsSendShortcut,t.closable&&(this.btnClose=Ce("",{noRipple:!0}),this.btnClose.classList.add("popup-close"),this.header.prepend(this.btnClose),t.onBackClick?(this.btnCloseAnimatedIcon=document.createElement("div"),this.btnCloseAnimatedIcon.classList.add("animated-close-icon"),this.btnClose.append(this.btnCloseAnimatedIcon)):this.btnClose.append(M("close")),L(this.btnClose,()=>{t.onBackClick&&this.btnCloseAnimatedIcon.classList.contains("state-back")?(this.btnCloseAnimatedIcon.classList.remove("state-back"),t.onBackClick()):this.hide()},{listenerSetter:this.listenerSetter})),this.withoutOverlay=t.withoutOverlay,this.withoutOverlay&&this.element.classList.add("no-overlay"),t.overlayClosable&&L(this.element,i=>{pe(i.target,"popup-container")||!i.target.isConnected||this.hide()},{listenerSetter:this.listenerSetter}),t.withConfirm&&(this.btnConfirm=document.createElement("button"),this.btnConfirm.classList.add("btn-primary","btn-color-primary"),t.withConfirm!==!0&&this.btnConfirm.append(U(t.withConfirm)),this.header.append(this.btnConfirm)),this.container.append(this.header),t.body&&(this.body=document.createElement("div"),this.body.classList.add("popup-body"),this.container.append(this.body)),t.scrollable){const i=this.scrollable=new me(this.body);if(this.attachScrollableListeners(),t.floatingHeader){this.attachScrollableListeners(this.header);const s=document.createElement("div");s.classList.add("popup-header-background"),this.header.prepend(s),this.header.classList.add("is-floating")}this.body||this.header.after(i.container)}t.footer&&(this.footer=document.createElement("div"),this.footer.classList.add("popup-footer"),(this.body||this.container).append(this.footer)),this.btnConfirmOnEnter=this.btnConfirm,this.setButtons(t.buttons),this.element.append(this.container),p.POPUPS.push(this)}setButtons(e){if(this.buttons=e,this.buttonsEl&&(this.buttonsEl.remove(),this.buttonsEl=void 0),!e?.length)return;const t=this.buttonsEl=document.createElement("div");t.classList.add("popup-buttons");const i=e.map(s=>{const r=document.createElement("button");if(r.className="popup-button btn"+(s.isDanger?" danger":" primary"),s.noRipple||se(r),s.text?r.append(s.text):s.langKey&&r.append(U(s.langKey,s.langArgs)),s.iconLeft||s.iconRight){const f=M(s.iconLeft||s.iconRight,"popup-button-icon",s.iconLeft?"left":"right");r.classList.add("with-icon"),s.iconLeft?r.prepend(f):r.append(f)}return L(r,async f=>{let c=s.callback?.(f);if(c!==void 0&&c instanceof Promise){const m=ae([s.element],!0);try{c=await c}catch{c=!1}c===!1&&m()}c!==!1&&this.hide()},{listenerSetter:this.listenerSetter}),s.element=r});if(!this.btnConfirmOnEnter&&e.length===2){const s=e.find(r=>!r.isCancel);s&&(this.btnConfirmOnEnter=s.element)}e.length>=3&&t.classList.add("is-vertical-layout"),t.append(...i),this.container.append(t)}attachScrollableListeners(e){return this.scrollable.attachBorderListeners(e)}onContentUpdate(){this.scrollable?.onAdditionalScroll?.()}show(){this.navigationItem={type:"popup",onPop:()=>{if(this.isConfirmationNeededOnClose){const e=this.isConfirmationNeededOnClose();if(e)return Promise.resolve(e).then(()=>{this.destroy()}),!1}return this.destroy()}},w.pushItem(this.navigationItem),Y(),C.append(this.element),this.element.offsetWidth,this.element.classList.add("active"),this.onContentUpdate(),this.withoutOverlay||(A.isOverlayActive=!0,N.checkAnimations2(!0)),setTimeout(()=>{this.element.classList.contains("active")&&this.listenerSetter.add(document.body)("keydown",e=>{!this.btnConfirmOnEnter||this.btnConfirmOnEnter.disabled||p.POPUPS[p.POPUPS.length-1]!==this||(this.confirmShortcutIsSendShortcut?be(e):e.key==="Enter")&&(fe(this.btnConfirmOnEnter),X(e))})},0)}hide(){this.destroyed||!this.navigationItem||w.backByItem(this.navigationItem)}hideWithCallback(e){this.addEventListener("closeAfterTimeout",e),this.hide()}forceHide(){return this.destroy()}destroy(){this.destroyed||(this.destroyed=!0,this.dispatchEvent("close"),this.element.classList.add("hiding"),this.element.classList.remove("active"),this.listenerSetter.removeAll(),this.middlewareHelper.destroy(),this.withoutOverlay||(A.isOverlayActive=!1),w.removeItem(this.navigationItem),this.navigationItem=void 0,z(p.POPUPS,this),G(),setTimeout(()=>{this.element.remove(),this.dispatchEvent("closeAfterTimeout"),this.cleanup(),this.scrollable?.destroy(),this.withoutOverlay||N.checkAnimations2(!1)},250))}static reAppend(){this.POPUPS.forEach(e=>{const{element:t,container:i}=e,s=t.parentElement;s&&s!==C&&C!==i&&C.append(t)})}static getPopups(e){return this.POPUPS.filter(t=>t instanceof e)}static createPopup(e,...t){return new e(...t)}};p.POPUPS=[];let P=p;const xe=n=>(n.find(t=>t.isCancel)||n.push({langKey:"Cancel",isCancel:!0}),n);function Ee(n,e){let t,i,s,r=0,f=0,c=0,m=0,v=0;const F=4,d={},Z=50,x=200,B=200;n.complete?T():n.onload=T;function V(){i.removeEventListener("mousedown",E),i.removeEventListener("touchstart",E),i.removeEventListener("wheel",W),document.removeEventListener("mouseup",g),document.removeEventListener("touchend",g),document.removeEventListener("mousemove",b),document.removeEventListener("touchmove",b),document.removeEventListener("keypress",D),t.remove(),i.remove(),s.remove()}function J(){i.addEventListener("mousedown",E,!1),i.addEventListener("touchstart",E,!1),i.addEventListener("wheel",W,!1),document.addEventListener("keypress",D,!1)}function T(){n.classList.add("crop-blur"),n.draggable=!1,s=new Image,s.src=n.src,s.draggable=!1,s.classList.add("crop-overlay-image"),e||(e=document.createElement("canvas")),t=document.createElement("div"),t.classList.add("crop-component"),i=document.createElement("div"),i.classList.add("crop-overlay");const o=document.createElement("div");o.classList.add("crop-overlay-color"),t.appendChild(i),n.parentNode.appendChild(t),t.appendChild(s),t.appendChild(n),t.appendChild(o),i.appendChild(s),s.style.maxWidth=n.width+"px",v=n.naturalWidth/n.offsetWidth;const h=n.offsetWidth/2-x/2,l=n.offsetHeight/2-B/2;R(x,B),k(h,l),I(h,l),J()}function R(o,a){c=o*v,m=a*v,i.style.width=o+"px",i.style.height=a+"px"}function k(o,a){f=a*v,r=o*v,s.style.top=-a+"px",s.style.left=-o+"px"}function I(o,a){i.style.top=a+"px",i.style.left=o+"px"}function Q(o){d.container_width=i.offsetWidth,d.container_height=i.offsetHeight,d.container_left=i.offsetLeft,d.container_top=i.offsetTop,d.mouse_x=(o.clientX||o.pageX||o.touches&&o.touches[0].clientX)+window.scrollX,d.mouse_y=(o.clientY||o.pageY||o.touches&&o.touches[0].clientY)+window.scrollY}function H(o){o=o*Math.PI*2;const a=Math.floor(i.clientWidth+o),h=Math.floor(i.clientHeight+o),l=s.clientWidth,S=s.clientHeight;let u,y;if(a<Z)return;if(a>l)return;u=i.offsetLeft-o/2,y=i.offsetTop-o/2;const te=u+a,ie=y+h;u<0&&(u=0),y<0&&(y=0),!(te>l)&&(ie>S||(R(a,a),k(u,y),I(u,y)))}function D(o){switch(o.preventDefault(),String.fromCharCode(o.charCode)){case"+":H(F);break;case"-":H(-F);break}}function W(o){o.preventDefault(),H(o.deltaY>0?1:-1)}function E(o){o.preventDefault(),o.stopPropagation(),Q(o),document.addEventListener("mousemove",b),document.addEventListener("touchmove",b),document.addEventListener("mouseup",g),document.addEventListener("touchend",g)}function g(o){o.preventDefault(),document.removeEventListener("mouseup",g),document.removeEventListener("touchend",g),document.removeEventListener("mousemove",b),document.removeEventListener("touchmove",b)}function b(o){const a={x:0,y:0};o.preventDefault(),o.stopPropagation(),a.x=o.pageX||o.touches&&o.touches[0].pageX,a.y=o.pageY||o.touches&&o.touches[0].pageY;let h=a.x-(d.mouse_x-d.container_left),l=a.y-(d.mouse_y-d.container_top);const S=i.offsetWidth,u=i.offsetHeight;h<0?h=0:h>s.offsetWidth-S&&(h=s.offsetWidth-S),l<0?l=0:l>s.offsetHeight-u&&(l=s.offsetHeight-u),k(h,l),I(h,l)}function ee(){e.width=c,e.height=m,e.getContext("2d").drawImage(n,r,f,c,m,0,0,c,m)}return{crop:ee,removeHandlers:V}}function Se(n,e){return new Promise(t=>{const i=new FileReader;i.addEventListener("loadend",s=>{t(s.target.result)}),i[e](n)})}function Le(n){return Se(n,"readAsDataURL")}class Be extends P{constructor(e={}){super("popup-avatar",{closable:!0}),this.image=new Image,this.cropper={crop:()=>{},removeHandlers:()=>{}},this.h6=document.createElement("h6"),$(this.h6,"Popup.Avatar.Title"),this.btnClose.classList.remove("btn-icon"),this.header.append(this.h6),this.cropContainer=document.createElement("div"),this.cropContainer.classList.add("crop"),this.cropContainer.append(this.image),e.isForum&&this.cropContainer.classList.add("is-forum"),this.input=document.createElement("input"),this.input.type="file",this.input.style.display="none",this.listenerSetter.add(this.input)("change",t=>{const i=t.target.files[0];i&&Le(i).then(s=>{this.image=new Image,this.cropContainer.append(this.image),this.image.src=s,this.image.onload=()=>{this.show(),this.cropper=Ee(this.image,this.canvas),this.input.value=""}})},!1),this.btnConfirm=_("btn-primary btn-color-primary btn-circle btn-crop btn-icon z-depth-1",{noRipple:!0,icon:"check"}),L(this.btnConfirm,()=>{this.cropper.crop(),this.hide(),this.canvas.toBlob(t=>{this.blob=t,this.darkenCanvas(),this.resolve()},"image/jpeg",1)},{listenerSetter:this.listenerSetter}),this.container.append(this.cropContainer,this.btnConfirm,this.input),this.addEventListener("closeAfterTimeout",()=>{this.cropper.removeHandlers(),this.image&&this.image.remove()})}resolve(){this.onCrop(()=>re.upload(this.blob))}open(e,t){this.canvas=e,this.onCrop=t,this.input.click()}darkenCanvas(){const e=this.canvas.getContext("2d");e.fillStyle="rgba(0, 0, 0, 0.3)",e.fillRect(0,0,this.canvas.width,this.canvas.height)}}export{Ce as B,P,Be as a,xe as b,w as c,ye as d,Fe as e,Oe as f,Le as g,be as h,ve as i,Ae as r};
//# sourceMappingURL=avatar-LtYhVRD2.js.map
