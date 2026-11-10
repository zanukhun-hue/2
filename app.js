/* Personal portfolio navigation and visual preview. Not an editor. */
(function(){
"use strict";
var data=window.PORTFOLIO||{};
var pages=["home","about","work","links"];
var labels={home:"01_HOME",about:"02_ABOUT",work:"03_MY_WORK",links:"04_SOCIALS"};
var starts={home:0,about:9,work:18,links:27}, duration=35,fps=24;
var section="home",seconds=0,playing=false,last=0,raf=0,audio=null,toastTimer=0;
function $(s,root){return (root||document).querySelector(s);}
function $$(s,root){return Array.from((root||document).querySelectorAll(s));}
function el(tag,cls,value){var n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;}
function set(s,value){var n=$(s);if(n)n.textContent=String(value==null?"":value);}
function media(u){return typeof u==="string"&&/^(https:\/\/|\.\/|assets\/|media\/)/i.test(u)&&!/[<>"\u0000-\u001f]/.test(u)&& !(window.NULL_OBJECT_MEDIA_READY===false && /^assets\/(?!.*-fallback\.svg$)/.test(u));}
function ext(u){return typeof u==="string"&&/^https:\/\//i.test(u);}
function fmt(t){var total=Math.floor(Math.max(t,0)*fps);return "00:00:"+String(Math.floor(total/fps)).padStart(2,"0")+":"+String(total%fps).padStart(2,"0");}
function notice(message){var n=$("#toast");n.textContent=message;n.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){n.classList.remove("show");},2700);}
function applyContent(){
  var brand=String(data.brand||"YOUR NAME").slice(0,70);
  document.title=brand+" — CREATIVE WORKSPACE";
  set("#projectBrand",brand);
  set("#topProjectTitle",brand.toUpperCase()+" / PERSONAL PROJECT");
  set("#heroOverline",data.kicker||"CREATIVE PORTFOLIO / 2026");
  var title=$("#heroTitle"),words=brand.trim().split(/\s+/),lastWord=words.length>1?words.pop():"";
  title.replaceChildren(document.createTextNode(words.join(" ")));
  if(lastWord)title.append(el("span","",lastWord));
  title.append(el("i","","®"));
  set("#heroSubtitle",data.tagline||"A PERSONAL WORLD BUILT FRAME BY FRAME.");
  set("#cassetteBrand",data.cassetteLabel||brand+" — THE COLLECTION");
  set("#audioTrackName",data.audioTitle||"YOUR_AUDIO_TRACK.mp3");
  var cover=media(data.artwork)?data.artwork:"assets/hero-fallback.svg";
  if(cover){
    var art=el("div","hero-artwork");
    art.style.backgroundImage="linear-gradient(#100c17aa,#100c17aa),url("+JSON.stringify(cover)+")";
    $("#stage-home").prepend(art);
  }
  if(media(data.audioPreview)){
    audio=new Audio(data.audioPreview);
    audio.preload="metadata";
    set("#audioSourceLabel","AUDIO FILE ATTACHED • CLICK PLAY");
    audio.addEventListener("loadedmetadata",function(){
      var len=Number.isFinite(audio.duration)?Math.min(duration,Math.ceil(audio.duration)):duration;
      set(".cassette-duration","00:"+String(len).padStart(2,"0"));
    });
    audio.addEventListener("error",function(){audio=null;set("#audioSourceLabel","AUDIO NOT AVAILABLE — CHECK THE FILE");pause();});
    audio.addEventListener("ended",pause);
  }else set("#audioSourceLabel","NO AUDIO ATTACHED • VISUAL PREVIEW ONLY");
  set("#aboutParagraph",data.aboutText||"Tell people about yourself here.");
  var aboutTitle=$("#aboutHeadline");
  aboutTitle.replaceChildren(document.createTextNode(data.aboutLine1||"MADE OF"),el("br"),el("em","",data.aboutLine2||"IDEAS."));
  var tags=$(".about-tags");tags.replaceChildren();
  var tagList=Array.isArray(data.aboutTags)&&data.aboutTags.length?data.aboutTags:["CREATOR","MOTION","EDITOR"];
  tagList.slice(0,5).forEach(function(item){tags.append(el("span","",String(item).slice(0,24)));});
  var portrait=media(data.profilePhoto)?data.profilePhoto:"assets/logo-fallback.svg";
  var img=el("img");img.src=portrait;img.alt="Null Object creator logo";img.loading="lazy";
  img.onerror=function(){if(!img.src.endsWith("/logo-fallback.svg"))img.src="assets/logo-fallback.svg";};
  $(".fake-photo").replaceWith(img);
  drawWork();drawLinks();markAssets();
}
function markAssets(){
  var rows=$$(".asset-tree-row"),arr=[data.artwork,null,data.profilePhoto,data.audioPreview];
  var projects=Array.isArray(data.projects)?data.projects:[];
  arr[1]=projects.some(function(p){return media(p.video);})?"assets/video":"";
  rows.forEach(function(row,i){if(media(arr[i]))row.title="Media configured in site-config.js";});
}
function drawWork(){
  var grid=$("#workGrid"),items=Array.isArray(data.projects)?data.projects.slice(0,3):[];
  grid.replaceChildren();
  for(var i=0;i<3;i++){
    (function(idx){
      var item=items[idx]||{},btn=el("button","work-card");btn.type="button";btn.dataset.work=String(idx);
      var art=el("span","work-art");
      if(media(item.poster)){var img=el("img");img.src=item.poster;img.alt=item.title||"Project";img.loading="lazy";art.append(img);}
      else{art.append(el("span","work-placeholder-glyph","▷"));art.append(el("span","",item.label||"VIDEO_0"+(idx+1)+".mp4"));}
      var caption=el("span","work-caption");
      caption.append(el("b","",item.title||"PROJECT 0"+(idx+1)));
      caption.append(el("small","",media(item.video)?"WATCH PROJECT ↗":"ADD VIDEO ↗"));
      btn.append(art,caption);
      btn.addEventListener("click",function(){openWork(idx);});
      grid.append(btn);
    })(i);
  }
}
function drawLinks(){
  var grid=$("#linksGrid"),links=Array.isArray(data.socialLinks)&&data.socialLinks.length?data.socialLinks.slice(0,9):[
    {title:"DISCORD",url:""},{title:"TIKTOK",url:""},{title:"YOUTUBE",url:""},
    {title:"TELEGRAM",url:""},{title:"INSTAGRAM",url:""},{title:"PERSONAL SITE",url:""}
  ];
  grid.replaceChildren();
  links.forEach(function(item){
    var ok=ext(item.url),node=el(ok?"a":"button","social-card");
    node.append(el("strong","",String(item.title||"SOCIAL").slice(0,26)));
    node.append(el("span","",ok?"↗":"+ ADD"));
    if(ok){node.href=item.url;node.target="_blank";node.rel="noopener noreferrer";}
    else{node.type="button";node.title="Add a URL in site-config.js";node.addEventListener("click",function(){notice("ADD THE "+String(item.title||"SOCIAL").toUpperCase()+" LINK IN site-config.js");});}
    grid.append(node);
  });
  set(".links-note",links.some(function(i){return ext(i.url);})?"FOLLOW THE LINKS TO CONNECT. EMPTY SLOTS ARE PLACEHOLDERS.":"ALL LINKS ARE PLACEHOLDERS — ADD YOUR SOCIAL URLS.");
}
function openWork(idx){
  var item=(Array.isArray(data.projects)?data.projects:[])[idx]||{},body=$("#videoDialogBody"),dlg=$("#videoDialog");
  set("#videoDialogTitle",item.title||"PROJECT 0"+(idx+1));
  body.replaceChildren();
  if(media(item.video)){
    var video=el("video");video.controls=true;video.playsInline=true;video.preload="metadata";video.src=item.video;video.setAttribute("aria-label",item.title||"Project");
    if(media(item.poster))video.poster=item.poster;body.append(video);
  }else{
    var empty=el("div","empty-video");
    empty.append(el("span","","▷"),el("strong","",item.label||"VIDEO_0"+(idx+1)+".mp4"),
      el("p","","Video placeholder. Add the MP4 link for this project in site-config.js to play it here."));
    body.append(empty);
  }
  if(!dlg.open)dlg.showModal();
}
function closeWork(){var dlg=$("#videoDialog"),video=$("video",dlg);if(video)video.pause();if(dlg.open)dlg.close();}
function drawRuler(){
  var ruler=$("#timeRuler");ruler.replaceChildren();
  for(var s=0;s<=duration;s+=5){
    var t=el("span","ruler-tick","00:"+String(s).padStart(2,"0"));t.style.left=s/duration*100+"%";ruler.append(t);
    if(s<duration)for(var n=1;n<5;n++){var minor=el("span","ruler-minor");minor.style.left=(s+n)/duration*100+"%";ruler.append(minor);}
  }
}
function clock(){set("#timecode",fmt(seconds));set("#currentTimeViewer",fmt(seconds));$("#timelinePlayhead").style.left=seconds/duration*100+"%";}
function setTime(v,fromRuler){
  seconds=Math.max(0,Math.min(duration,v));clock();
  if(fromRuler)goTo(seconds<9?"home":seconds<18?"about":seconds<27?"work":"links",false);
}
function goTo(page,jump){
  if(!pages.includes(page))return;
  section=page;
  $$(".stage-page").forEach(function(n){n.classList.toggle("active",n.dataset.page===page);});
  $$("[data-route]").forEach(function(n){
    n.classList.toggle("selected",n.classList.contains("tree-item")&&n.dataset.route===page);
    n.classList.toggle("active",(n.classList.contains("layer-nav")||n.classList.contains("timeline-track"))&&n.dataset.route===page);
    if(n.classList.contains("layer-nav"))n.setAttribute("aria-current",n.dataset.route===page?"page":"false");
  });
  ["#compositionTitle","#crumbLabel","#inspectorComp","#timelineComp"].forEach(function(s){set(s,labels[page]);});
  if(jump!==false){pause();setTime(starts[page],false);}
  if(location.hash!=="#"+page)history.replaceState(null,"","#"+page);
}
function updateButtons(){
  set("#togglePreview",playing?"❚❚":"▶");
  set("#heroPlay",playing?"❚❚":"▶");
  $("#heroPlay").setAttribute("aria-label",playing?"Pause tape preview":"Start tape preview");
  $("#cassetteShell").classList.toggle("is-playing",playing);
}
function pause(){
  playing=false;cancelAnimationFrame(raf);last=0;
  if(audio)audio.pause();updateButtons();
}
function renderTick(timestamp){
  if(!playing)return;
  if(last)seconds+=Math.min(.09,(timestamp-last)/1000);
  last=timestamp;
  if(seconds>=duration){pause();seconds=0;}
  clock();
  if(playing)raf=requestAnimationFrame(renderTick);
}
function togglePreview(){
  if(playing){pause();return;}
  if(section!=="home")goTo("home");
  if(seconds>=duration)seconds=0;
  playing=true;last=0;
  if(audio){
    try{
      if(Number.isFinite(audio.duration))audio.currentTime=Math.min(seconds,audio.duration);else audio.currentTime=seconds;
      var p=audio.play();
      if(p&&p.catch)p.catch(function(){notice("AUDIO COULD NOT PLAY. SHOWING VISUAL PREVIEW.");});
    }catch(e){notice("AUDIO UNAVAILABLE. VISUAL PREVIEW ONLY.");}
  }else notice("VISUAL DEMO ONLY • ADD AN MP3 TO ENABLE AUDIO");
  updateButtons();raf=requestAnimationFrame(renderTick);
}
function closeMenu(){$("#menuDropdown").classList.add("hidden");$$(".menu-btn").forEach(function(b){b.classList.remove("open");});}
function installMenus(){
  var menu=$("#menuDropdown");
  $("#appMenus").addEventListener("click",function(event){
    var b=event.target.closest("[data-menu]");if(!b)return;
    if(!menu.classList.contains("hidden")&&b.classList.contains("open")){closeMenu();return;}
    $$(".menu-btn").forEach(function(x){x.classList.toggle("open",x===b);});
    menu.replaceChildren();
    pages.forEach(function(page,i){
      var row=el("button");row.type="button";
      row.append(document.createTextNode(String(i+1).padStart(2,"0")+" / "+labels[page]),el("small","",String(i+1)));
      row.addEventListener("click",function(){goTo(page);closeMenu();});menu.append(row);
    });
    if(b.dataset.menu==="help"){
      var item=el("button","", "Keyboard: 1–4 navigate / Space preview");
      item.addEventListener("click",function(){notice("1–4 NAVIGATE • SPACE PREVIEW • ESC CLOSE");closeMenu();});menu.append(item);
    }
    menu.style.left=Math.max(0,Math.min(b.getBoundingClientRect().left,innerWidth-235))+"px";
    menu.classList.remove("hidden");
  });
  document.addEventListener("pointerdown",function(e){if(!e.target.closest(".app-menubar"))closeMenu();});
}
function init(){
  applyContent();drawRuler();
  $$("[data-route]").forEach(function(n){n.addEventListener("click",function(){goTo(n.dataset.route);});});
  $("#heroPlay").addEventListener("click",togglePreview);
  $("#togglePreview").addEventListener("click",togglePreview);
  $("#restartPreview").addEventListener("click",function(){pause();goTo("home");setTime(0);});
  $("#timeRuler").addEventListener("click",function(e){
    var rect=this.getBoundingClientRect();pause();setTime((e.clientX-rect.left)/rect.width*duration,true);
  });
  $("#closeVideoDialog").addEventListener("click",closeWork);
  $("#videoDialog").addEventListener("click",function(e){if(e.target===this)closeWork();});
  $("#videoDialog").addEventListener("close",function(){var v=$("video",this);if(v)v.pause();});
  installMenus();
  document.addEventListener("keydown",function(e){
    if(e.target.matches("input,textarea,[contenteditable]"))return;
    if(e.key==="Escape"){closeWork();closeMenu();return;}
    if($("#videoDialog").open)return;
    if(["1","2","3","4"].includes(e.key)&&!e.altKey&&!e.ctrlKey&&!e.metaKey)goTo(pages[Number(e.key)-1]);
    if(e.code==="Space"&&!e.repeat&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();togglePreview();}
  });
  document.addEventListener("visibilitychange",function(){if(document.hidden)pause();});
  window.addEventListener("hashchange",function(){var p=location.hash.slice(1);if(pages.includes(p))goTo(p);});
  var first=location.hash.slice(1);
  goTo(pages.includes(first)?first:"home");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
