import{e as l}from"./index-CVoTT_sz.js";import{I as n}from"./button-BjZOIQLL.js";import{I as d,l as o}from"./wrapEmojiText-Bb-b5VOZ.js";class h{constructor(e,i){this.container=e,this.input=i,this.passwordVisible=!1,this.onVisibilityClick=r=>{l(r),this.passwordVisible=!this.passwordVisible,this.toggleVisible.replaceChildren(n(this.passwordVisible?"eye2":"eye1")),this.input.type=this.passwordVisible?"text":"password",this.onVisibilityClickAdditional?.()},i.type="password",i.setAttribute("required",""),i.name="notsearch_password",i.autocomplete="off";const s=document.createElement("input");s.classList.add("stealthy"),s.tabIndex=-1,s.type="password",i.parentElement.prepend(s),i.parentElement.insertBefore(s.cloneNode(),i.nextSibling);const a=this.toggleVisible=document.createElement("span");a.classList.add("toggle-visible"),a.append(n("eye1")),e.classList.add("input-field-password"),e.append(a),a.addEventListener("click",this.onVisibilityClick),a.addEventListener("touchend",this.onVisibilityClick)}}class u extends d{constructor(e={}){super({plainText:!0,allowStartingSpace:!0,...e}),this.helpers=new h(this.container,this.input)}}class w{constructor(e,i){this.passwordInputField=e,this.size=i,this.needFrame=0,this.container=document.createElement("div"),this.container.classList.add("media-sticker-wrapper")}load(){return this.loadPromise?this.loadPromise:this.loadPromise=o.loadAnimationAsAsset({container:this.container,loop:!1,autoplay:!1,width:this.size,height:this.size,noCache:!0},"TwoFactorSetupMonkeyPeek").then(e=>(this.animation=e,this.animation.addEventListener("enterFrame",i=>{(this.animation.direction===1&&i>=this.needFrame||this.animation.direction===-1&&i<=this.needFrame)&&(this.animation.setSpeed(1),this.animation.pause())}),this.passwordInputField.helpers.onVisibilityClickAdditional=()=>{this.passwordInputField.helpers.passwordVisible?(this.animation.setDirection(1),this.animation.curFrame=0,this.needFrame=16,this.animation.play()):(this.animation.setDirection(-1),this.animation.curFrame=16,this.needFrame=0,this.animation.play())},o.waitForFirstFrame(e)))}remove(){this.animation&&this.animation.remove()}}function b(t){const e=document.createElement("span");return typeof t=="string"?e.innerHTML=t:e.append(t),e}export{u as P,w as a,h as b,b as h};
//# sourceMappingURL=htmlToSpan-DMQ4VFfl.js.map
