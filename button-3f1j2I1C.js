import{M as w,n as E,j as I,I as y,k,ad as x,f as M,cA as A,i as D}from"./index-BWSv4yyN.js";import{i as R,f as O}from"./page-uJBByU88.js";class P{constructor(){this.promises={},this.raf=E.bind(null),this.scheduled=!1}do(e,t){let r=this.promises[e];return r||(this.scheduleFlush(),r=this.promises[e]=I()),t!==void 0&&r.then(()=>t()),r}measure(e){return this.do("read",e)}mutate(e){return this.do("write",e)}mutateElement(e,t){const r=R(e),n=r?this.mutate():Promise.resolve();return t!==void 0&&(r?n.then(()=>t()):t()),n}scheduleFlush(){this.scheduled||(this.scheduled=!0,this.raf(()=>{this.promises.read&&this.promises.read.resolve(),this.promises.write&&this.promises.write.resolve(),this.scheduled=!1,this.promises={}}))}}const L=new P;w&&(w.sequentialDom=L);let U=0;function z(a,e=()=>Promise.resolve(),t=null,r=!1,n=a){if(a.querySelector(".c-ripple"))return;a.classList.add("rp");const o=document.createElement("div");o.classList.add("c-ripple"),a.classList.contains("rp-square")&&o.classList.add("is-square"),a[r?"prepend":"append"](o);let l;const g=(i,c)=>{const p=Date.now(),s=document.createElement("div"),_=U++,u=+window.getComputedStyle(o).getPropertyValue("--ripple-duration").replace("s","")*1e3,S=l=()=>{const d=Date.now()-p,f=()=>{L.mutate(()=>{s.remove()}),t?.(_)};if(d<u){const h=Math.max(u-d,u/2);setTimeout(()=>s.classList.add("hiding"),Math.max(h-u/2,0)),setTimeout(f,h)}else s.classList.add("hiding"),setTimeout(f,u/2);y||(window.removeEventListener("contextmenu",l),window.removeEventListener("mousemove",l)),l=null,m=!1};e?.(_),E(()=>{if(S!==l)return;const d=o.getBoundingClientRect();s.classList.add("c-ripple__circle");const f=i-d.left,h=c-d.top,b=Math.sqrt((Math.abs(h-d.height/2)+d.height/2)**2+(Math.abs(f-d.width/2)+d.width/2)**2),q=f-b/2,C=h-b/2;s.style.width=s.style.height=b+"px",s.style.left=q+"px",s.style.top=C+"px",s.style.opacity="0",o.append(s),s.offsetWidth,s.style.opacity=""})},v=i=>i.target!==a&&(["BUTTON","A"].includes(i.target.tagName)||x(i.target,"c-ripple")!==o)&&(n===a||!O(i.target,n))&&!x(i.target,"checkbox-field");let m=!1;if(y){const i=()=>{l?.()},c=p=>{if(!k.isAvailable("animations")||p.touches.length>1||m||v(p))return;m=!0;const{clientX:s,clientY:_}=p.touches[0];g(s,_),n.addEventListener("touchend",i,{once:!0}),window.addEventListener("touchmove",u=>{u.cancelBubble=!0,u.stopPropagation(),i(),n.removeEventListener("touchend",i)},{once:!0})};return n.addEventListener("touchstart",c,{passive:!0}),{dispose:()=>n.removeEventListener("touchstart",c),element:o}}else{const i=c=>{if(![0,2].includes(c.button)||!k.isAvailable("animations")||n.dataset.ripple==="0"||v(c))return;if(m){m=!1;return}const{clientX:p,clientY:s}=c;g(p,s),window.addEventListener("mouseup",l,{once:!0,passive:!0}),window.addEventListener("contextmenu",l,{once:!0,passive:!0})};return n.addEventListener("mousedown",i,{passive:!0}),{dispose:()=>n.removeEventListener("mousedown",i),element:o}}}const B={check:"e900",checks:"e901",activesessions:"e902",add:"e903",add_reaction:"e904",addboost:"e905",addmember_filled:"e906",adduser:"e907",admin:"e908",ads:"e909",animals:"e90a",animations:"e90b",app_expand:"e90c",app_shrink:"e90d",archive:"e90e",arrow_down:"e90f",arrow_next:"e910",arrow_prev:"e911",arrowcircle:"e912",arrowhead:"e913",attach:"e914",audio_repeat:"e915",audio_repeat_single:"e916",author_hidden:"e917",avatarnext:"e918",avatarprevious:"e919",binfilled:"e91a",bold:"e91b",bomb:"e91c",boost:"e91d",boostcircle:"e91e",botcom:"e91f",bots:"e920",bubblereply:"e921",bug:"e922",calendar:"e923",calendarfilter:"e924",camera:"e925",cameraadd:"e926",captiondown:"e927",captionup:"e928",car:"e929",card:"e92a",card_outline:"e92b",cash_circle:"e92c",channel:"e92d",channelviews:"e92e",chatspinned:"e92f",chatsplaceholder:"e930",check1:"e931",checkbox:"e932",checkboxblock:"e933",checkboxempty:"e934",checkboxon:"e935",checkretract:"e936",checkround:"e937",checkround_filled:"e938",clock:"e939",close:"e93a",clouddownload:"e93b",collapse:"e93c",colorize:"e93d",comments:"e93e",commentssticker:"e93f",copy:"e940",crossgif:"e941",crossround:"e942",crossstar:"e943",darkmode:"e944",data:"e945",delete:"e946",delete_filled:"e947",deletedaccount:"e948",deleteleft:"e949",deleteuser:"e94a",devices:"e94b",document:"e94c",down:"e94d",download:"e94e",dragfiles:"e94f",dragmedia:"e950",eats:"e951",edit:"e952",email:"e953",endcall_filled:"e954",enter:"e955",expand:"e956",eye:"e957",eye1:"e958",eye2:"e959",eyecross_outline:"e95a",factcheck:"e95b",fast_forward:"e95c",fast_rewind:"e95d",favourites:"e95e",flag:"e95f",flip:"e960",folder:"e961",fontsize:"e962",forward:"e963",forward_filled:"e964",fullscreen:"e965",gc_microphone:"e966",gc_microphoneoff:"e967",gifs:"e968",gift:"e969",gift_premium:"e96a",group:"e96b",group_filled:"e96c",groupmedia:"e96d",groupmediaoff:"e96e",hand:"e96f",help:"e970",hide:"e971",image:"e972",info:"e973",info2:"e974",italic:"e975",keyboard:"e976",lamp:"e977",language:"e978",largepause:"e979",largeplay:"e97a",left:"e97b",limit_chat:"e97c",limit_chats:"e97d",limit_file:"e97e",limit_folders:"e97f",limit_link:"e980",limit_pin:"e981",link:"e982",link_paid:"e983",list:"e984",listscreenshare:"e985",livelocation:"e986",location:"e987",lock:"e988",lockoff:"e989",loginlogodesktop:"e98a",loginlogomobile:"e98b",logout:"e98c",mediaspoiler:"e98d",mediaspoileroff:"e98e",mention:"e98f",menu:"e990",message:"e991",message_jump:"e992",message_quote:"e993",messageunread:"e994",microphone:"e995",microphone_crossed:"e996",microphone_crossed_filled:"e997",microphone_filled:"e998",minus:"e999",monospace:"e99a",more:"e99b",multistories:"e99c",mute:"e99d",muted:"e99e",mynotes:"e99f",newchannel:"e9a0",newchannel_filled:"e9a1",newchat_filled:"e9a2",newgroup:"e9a3",newgroup_filled:"e9a4",newprivate:"e9a5",newprivate_filled:"e9a6",newtab:"e9a7",next:"e9a8",nochannel:"e9a9",noncontacts:"e9aa",nosound:"e9ab",online:"e9ac",passwordoff:"e9ad",pause:"e9ae",permissions:"e9af",phone:"e9b0",phone_filled:"e9b1",pin:"e9b2",pin2:"e9b3",pinlist:"e9b4",pinned_filled:"e9b5",pinnedchat:"e9b6",pip:"e9b7",play:"e9b8",playback_05:"e9b9",playback_15:"e9ba",playback_1x:"e9bb",playback_2x:"e9bc",plus:"e9bd",plusround:"e9be",poll:"e9bf",premium_addone:"e9c0",premium_avatars:"e9c1",premium_badge:"e9c2",premium_colors:"e9c3",premium_double:"e9c4",premium_emoji:"e9c5",premium_filesize:"e9c6",premium_lastseen:"e9c7",premium_limits:"e9c8",premium_lock:"e9c9",premium_management:"e9ca",premium_noads:"e9cb",premium_privacy:"e9cc",premium_reactions:"e9cd",premium_restrict:"e9ce",premium_speed:"e9cf",premium_status:"e9d0",premium_stickers:"e9d1",premium_tags:"e9d2",premium_transcription:"e9d3",premium_translate:"e9d4",premium_unlock:"e9d5",premium_wallpaper:"e9d6",previous:"e9d7",promote:"e9d8",quote:"e9d9",quote_outline:"e9da",radiooff:"e9db",radioon:"e9dc",reactions:"e9dd",reactions_filled:"e9de",readchats:"e9df",recent:"e9e0",replace:"e9e1",reply:"e9e2",reply_filled:"e9e3",restrict:"e9e4",revenue:"e9e5",rightpanel:"e9e6",rotate_left:"e9e7",rotate_right:"e9e8",saved:"e9e9",savedmessages:"e9ea",schedule:"e9eb",scheduled:"e9ec",search:"e9ed",select:"e9ee",send:"e9ef",send2:"e9f0",sending:"e9f1",sendingerror:"e9f2",settings:"e9f3",settings_filled:"e9f4",sharescreen_filled:"e9f5",shipping:"e9f6",shuffle:"e9f7",smallscreen:"e9f8",smile:"e9f9",speaker:"e9fa",speakerfilled:"e9fb",speakeroff:"e9fc",speakerofffilled:"e9fd",spoiler:"e9fe",sport:"e9ff",star:"ea00",star_filled:"ea01",statistics:"ea02",stickers:"ea03",stickers_face:"ea04",stop:"ea05",stories:"ea06",storyreply:"ea07",storyrepost:"ea08",strikethrough:"ea09",tag:"ea0a",tag_add:"ea0b",tag_crossed:"ea0c",tag_filter:"ea0d",tag_name:"ea0e",textedit:"ea0f",timer:"ea10",tip:"ea11",tools:"ea12",topics:"ea13",transcribe:"ea14",unarchive:"ea15",unclaimed:"ea16",underline:"ea17",unmute:"ea18",unpin:"ea19",unread:"ea1a",up:"ea1b",user:"ea1c",username:"ea1d",videocamera:"ea1e",videocamera_crossed_filled:"ea1f",videocamera_filled:"ea20",videochat:"ea21",volume_down:"ea22",volume_mute:"ea23",volume_off:"ea24",volume_up:"ea25",webview:"ea26",zoomin:"ea27",zoomout:"ea28"},T=new Set(["avatarnext","avatarprevious","arrow_next","channel","chatspinned","fast_forward","fast_rewind","forward","forward_filled","group","group_filled","left","listscreenshare","logout","muted","newchannel_filled","newchannel","newgroup","newgroup_filled","next","nosound","previous","send","send2","reply","reply_filled","sharescreen_filled","transcribe","storyreply","premium_noads","topics","pinlist","deleteleft"]);function N(a){return String.fromCharCode(parseInt(B[a],16))}function j(a,...e){const t=document.createElement("span");return M.isRTL&&T.has(a)&&e.push("icon-reflect"),t.classList.add(A,...e),t.textContent=N(a),t}function H(a,e={}){const t=document.createElement(e.asLink?"a":e.asDiv?"div":"button");return t.className=a,e.noRipple||(e.rippleSquare&&t.classList.add("rp-square"),z(t)),e.icon&&F(t,e.icon,!1),e.onlyMobile&&t.classList.add("only-handhelds"),e.disabled&&t.setAttribute("disabled","true"),e.text&&t.append(D(e.text,e.textArgs)),t}function F(a,e,t=a.querySelector(".button-icon")){const r=j(e,"button-icon");return t?t.replaceWith(r):a.append(r),r}export{H as B,j as I,F as a,N as g,z as r,L as s};
//# sourceMappingURL=button-3f1j2I1C.js.map
