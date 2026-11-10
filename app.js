/* AE WORKSPACE — interactive fan-made compositing studio.
   No dependencies, no cookies, no external backend. */
(function () {
  "use strict";

  var CONFIG = window.CREATOR_CONFIG || {};
  var STORE_KEY = "ae-workspace-project-v1";
  var LAYOUT_KEY = "ae-workspace-layout-v1";
  var FPS = 24;
  var DURATION = 12;
  var uid = 100;
  var state = {
    comp: "intro", comps: {}, assets: [], time: 0, selected: null,
    playing: false, zoom: 100, stageZoom: 100, panX: 0, panY: 0, quality: "Full", activeProp: "opacity",
    tool: "select", grid: false, safe: false, checker: false,
    leftTab: "project", rightTab: "properties"
  };
  var raf = 0, lastFrame = 0, saveTimer = 0, toastTimer = 0;
  var dragging = null;

  function $ (s, parent) { return (parent || document).querySelector(s); }
  function $$ (s, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(s)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function fmtTime(time) {
    var frames = Math.max(0, Math.round(time * FPS));
    var f = frames % FPS;
    var secs = Math.floor(frames / FPS);
    return "00:" + String(Math.floor(secs / 60)).padStart(2,"0") + ":" + String(secs % 60).padStart(2,"0") + ":" + String(f).padStart(2,"0");
  }
  function newId() { uid += 1; return "l" + uid; }
  function mk(type, name, x, y, options) {
    var o = options || {};
    return Object.assign({
      id: newId(), type: type, name: name, text: name, x: x, y: y,
      width: 50, size: 4, color: "#f7f4ff", opacity: 100,
      rotation: 0, scale: 100, weight: 700, visible: true,
      locked: false, solo: false, effects: {}, keys: {}
    }, o);
  }
  function addKeys(layer, prop, pairs) {
    layer.keys[prop] = pairs.map(function(pair){return {t:pair[0],v:pair[1]};});
    return layer;
  }
  function buildDefaults() {
    var intro = [
      mk("text","MAIN / TITLE",50,49,{text:"MAKE IT\nMOVE.",size:11.5,width:80,weight:800,keys:{opacity:[{t:0,v:0},{t:.85,v:100}],y:[{t:0,v:55},{t:1.1,v:49}]}}),
      mk("text","SUBTITLE",50,76,{text:"THE INTERNET IS YOUR COMPOSITION.",size:1.9,width:80,color:"#b6a8dc",weight:500,keys:{opacity:[{t:0,v:0},{t:1.25,v:0},{t:2,v:100}]}}),
      mk("text","EYEBROW",50,22,{text:"AFTER EFFECTS  /  CREATIVE WORKSPACE",size:1.7,width:74,color:"#c8baf8",weight:600,keys:{opacity:[{t:0,v:0},{t:.4,v:100}]}}),
      mk("text","BOTTOM / HINT",50,88,{text:"▶   PRESS SPACE TO PLAY THE TIMELINE",size:1.15,width:65,color:"#aab0c2",weight:500}),
      mk("shape","ORBIT / 01",52,49,{width:46,x:52,y:49,color:"#7768bd",opacity:40,rotation:-15,keys:{rotation:[{t:0,v:-15},{t:12,v:345}],scale:[{t:0,v:90},{t:6,v:115},{t:12,v:90}]}}),
      mk("shape","ORBIT / 02",52,49,{width:32,color:"#476f9c",opacity:31,keys:{rotation:[{t:0,v:0},{t:12,v:-360}]}}),
      mk("text","LEFT / INDEX",13,12,{text:"01 / THE IDEA",size:1.25,width:21,color:"#9992b9",weight:500}),
      mk("text","RIGHT / INDEX",87,12,{text:"2026 / STUDIO",size:1.25,width:21,color:"#9992b9",weight:500})
    ];
    var social = [
      mk("text","TITLE",50,37,{text:"LET'S\nCONNECT.",size:10.5,width:84,weight:800,keys:{opacity:[{t:0,v:0},{t:.8,v:100}],y:[{t:0,v:47},{t:1.2,v:37}]}}),
      mk("text","NAME",50,69,{text:CONFIG.name || "NULL—OBJECT AE",size:2.2,width:80,color:"#b5a7ec",weight:700}),
      mk("text","CONTACT",50,81,{text:"OPEN CONTACT CARD  ↗",size:1.7,width:65,color:"#e7e1fa",weight:600}),
      mk("shape","ARC / PURPLE",47,45,{width:55,color:"#a191de",opacity:31,rotation:25}),
      mk("shape","ARC / CYAN",57,43,{width:42,color:"#6fbbd6",opacity:26,rotation:65}),
      mk("text","KICKER",50,16,{text:"SOCIALS / ABOUT ME / LINKS",size:1.5,width:70,color:"#b6b2cc",weight:600})
    ];
    var showreel = [
      mk("text","THE WORK",50,44,{text:"FRAME BY\nFRAME.",size:10.2,width:80,weight:800,keys:{scale:[{t:0,v:85},{t:2,v:100},{t:8,v:108},{t:12,v:85}],rotation:[{t:0,v:-4},{t:2,v:0},{t:12,v:4}]}}),
      mk("text","LINE ONE",50,76,{text:"DESIGN  /  MOTION  /  EXPERIMENT",size:1.8,width:70,color:"#cfbefc",weight:600}),
      mk("shape","SPHERE 01",27,42,{width:24,color:"#9e7de6",opacity:48,keys:{x:[{t:0,v:20},{t:6,v:36},{t:12,v:20}]}}),
      mk("shape","SPHERE 02",75,61,{width:35,color:"#6a8ad0",opacity:26,keys:{y:[{t:0,v:72},{t:6,v:46},{t:12,v:72}]}}),
      mk("text","TOP / LABEL",50,13,{text:"AN OPEN CANVAS FOR EVERYTHING",size:1.6,width:70,color:"#a29db5",weight:500})
    ];
    return {intro:intro,social:social,showreel:showreel};
  }
  function currentLayers(){return state.comps[state.comp] || [];}
  function currentLayer(){return currentLayers().find(function(l){return l.id === state.selected;}) || null;}
  function valAt(layer, prop) {
    var base = Number(layer[prop]);
    if (!Number.isFinite(base)) base = prop === "scale" ? 100 : 0;
    var ks = (layer.keys && layer.keys[prop] || []).slice().sort(function(a,b){return a.t-b.t;});
    if (!ks.length) return base;
    if (state.time <= ks[0].t) return Number(ks[0].v);
    for (var i = 0; i < ks.length - 1; i++) {
      if (state.time <= ks[i+1].t) {
        var d = ks[i+1].t - ks[i].t;
        var f = d ? (state.time-ks[i].t)/d : 1;
        f = f*f*(3-2*f);
        return Number(ks[i].v)+(Number(ks[i+1].v)-Number(ks[i].v))*f;
      }
    }
    return Number(ks[ks.length-1].v);
  }
  function toast(msg){
    var e = $("#toast"); e.textContent = msg; e.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){e.classList.remove("show");},2600);
  }
  function queueSave() {
    $("#saveState").textContent = "● EDITED";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProject,450);
  }
  function saveProject(){
    try {
      var json = JSON.stringify({version:1,comp:state.comp,comps:state.comps,assets:state.assets});
      localStorage.setItem(STORE_KEY,json);
      $("#saveState").textContent = "● AUTOSAVED";
    } catch(e) {
      $("#saveState").textContent = "● SAVE LIMITED";
      toast("Browser storage is full. Export the project instead.");
    }
  }
  function restoreProject(){
    state.comps = buildDefaults();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || !data.comps || typeof data.comps !== "object" || !Object.keys(data.comps).length) return;
      state.comps = sanitizeComps(data.comps);
      state.assets = Array.isArray(data.assets) ? data.assets.filter(function(a){return a && typeof a.url==="string" && /^data:image\//.test(a.url);}).slice(0,30) : [];
      state.comp = state.comps[data.comp] ? data.comp : Object.keys(state.comps)[0];
    } catch(e) { console.warn("Could not restore local project",e); }
  }
  function sanitizeComps(comps) {
    var clean = {}, ids = Object.keys(comps).slice(0,20);
    ids.forEach(function(k){
      if (!Array.isArray(comps[k])) return;
      clean[k.slice(0,60)] = comps[k].slice(0,60).filter(function(l){return l && ["text","shape","solid","image"].includes(l.type);}).map(function(l){
        var safe = mk(l.type,String(l.name || "Layer").slice(0,100),50,50,{});
        ["id","text","color","x","y","width","size","opacity","rotation","scale","weight","visible","locked","solo","effects","keys","image"].forEach(function(p){
          if (Object.prototype.hasOwnProperty.call(l,p)) safe[p]=l[p];
        });
        safe.id = String(safe.id).slice(0,100);
        safe.text = String(safe.text).slice(0,600);
        safe.name = String(safe.name).slice(0,100);
        safe.color = /^#[0-9a-fA-F]{6}$/.test(safe.color) ? safe.color : "#ffffff";
        ["x","y","width","size","opacity","rotation","scale"].forEach(function(p){safe[p]=Number.isFinite(Number(safe[p])) ? clamp(Number(safe[p]),-500,500) : 0;});
        safe.effects = safe.effects && typeof safe.effects === "object" ? safe.effects : {};
        var cleanedKeys = {};
        ["x","y","opacity","rotation","scale"].forEach(function(p){if (Array.isArray(safe.keys && safe.keys[p])) cleanedKeys[p]=safe.keys[p].filter(function(v){return v && Number.isFinite(Number(v.t)) && Number.isFinite(Number(v.v));}).slice(0,100).map(function(v){return {t:clamp(Number(v.t),0,DURATION),v:clamp(Number(v.v),-500,500)};});});
        safe.keys=cleanedKeys;
        safe.image = typeof safe.image==="string" && /^data:image\//.test(safe.image) ? safe.image : null;
        return safe;
      });
    });
    return Object.keys(clean).length ? clean : buildDefaults();
  }

  function refreshViewer(){
    var wrap=$("#compositionWrap");
    wrap.style.transform="translate("+state.panX+"px,"+state.panY+"px) scale("+(state.stageZoom/100)+")";
    wrap.style.imageRendering=state.quality==="Quarter"?"pixelated":"auto";
    $("#zoomButton").innerHTML=(state.stageZoom===100?"Fit":state.stageZoom+"%")+" <span>⌄</span>";
    $("#resButton").innerHTML=state.quality+" <span>⌄</span>";
  }
  function drawStage() {
    var frame = $("#compositionFrame"), root = $("#stageLayers");
    if (!frame || !root) return;
    var w = frame.clientWidth || 800, h = frame.clientHeight || 450;
    var layers = currentLayers();
    var onlySolo = layers.some(function(l){return l.solo && l.visible;});
    var alive = {};
    layers.forEach(function(layer, i){
      alive[layer.id] = true;
      var node = root.querySelector('[data-layer-id="'+CSS.escape(layer.id)+'"]');
      if (!node) {
        node = document.createElement("div");
        node.className = "stage-layer";
        node.dataset.layerId = layer.id;
        root.appendChild(node);
      }
      node.className = "stage-layer type-" + layer.type + (layer.locked?" locked":"") + (state.selected===layer.id?" selected":"");
      var x = valAt(layer,"x"), y = valAt(layer,"y");
      node.style.left = x + "%";
      node.style.top = y + "%";
      node.style.zIndex = String(100 - i);
      node.style.width = (Number(layer.width)||50) + "%";
      node.style.opacity = (Number(valAt(layer,"opacity"))/100);
      node.style.display = !layer.visible || (onlySolo && !layer.solo) ? "none" : "flex";
      node.style.transform = "translate(-50%,-50%) rotate(" + valAt(layer,"rotation") + "deg) scale(" + Math.max(.01,valAt(layer,"scale")/100) + ")";
      node.style.color = layer.color;
      node.style.fontWeight = String(layer.weight||700);
      node.style.fontSize = (w*(Number(layer.size)||3)/100).toFixed(2) + "px";
      node.style.borderColor = layer.color;
      node.style.boxShadow = layer.type==="shape" ? "0 0 32px "+layer.color+"33,inset 0 0 22px "+layer.color+"12" : "";
      node.style.filter = makeFilter(layer);
      node.style.textShadow = layer.effects && layer.effects.glow ? "0 0 15px "+layer.color+",0 0 55px "+layer.color : "";
      if (layer.type==="shape" || layer.type==="solid") {
        node.textContent = "";
        if (layer.type==="solid") node.style.backgroundColor=layer.color;
      } else if (layer.type==="image") {
        if (!node.firstChild || node.firstChild.tagName!=="IMG") {
          node.textContent = "";
          var image = document.createElement("img");
          image.draggable = false;
          image.alt = layer.name;
          node.appendChild(image);
        }
        if (node.firstChild.src !== layer.image && layer.image) node.firstChild.src=layer.image;
      } else {
        if (node.textContent!==layer.text) node.textContent=layer.text;
      }
    });
    $$(".stage-layer",root).forEach(function(node){if(!alive[node.dataset.layerId])node.remove();});
    var selected = root.querySelector('[data-layer-id="'+CSS.escape(state.selected||"___")+'"]');
    var selection = $("#stageSelection");
    if (selected && selected.style.display!=="none") {
      var r=selected.getBoundingClientRect(), fr=frame.getBoundingClientRect();
      selection.classList.remove("hidden");
      var z=state.stageZoom/100;
      selection.style.left = ((r.left-fr.left+r.width/2)/z)+"px";
      selection.style.top = ((r.top-fr.top+r.height/2)/z)+"px";
      selection.style.width = (r.width/z)+"px";selection.style.height=(r.height/z)+"px";
    } else selection.classList.add("hidden");
    $("#stageGrid").classList.toggle("hidden",!state.grid);
    frame.classList.toggle("safe-margins",state.safe);
    frame.classList.toggle("checker",state.checker);
    refreshViewer();
  }
  function makeFilter(layer){
    var f = layer.effects || {};
    return (f.blur ? "blur(2px) " : "") + (f.shadow ? "drop-shadow(6px 8px 8px #000c) " : "") + (f.saturate ? "saturate(1.8)" : "");
  }
  function drawProjectTree(){
    var labels={intro:"01 / INTRO_SEQUENCE",social:"02 / ABOUT_CREATOR",showreel:"03 / SHOWREEL"};
    $("#projectTree").innerHTML = Object.keys(state.comps).map(function(id,i){
      return '<button class="project-item '+(id===state.comp?"current":"")+'" data-comp="'+esc(id)+'"><span class="item-icon comp">◩</span><span>'+esc(labels[id] || String(i+1).padStart(2,"0")+" / "+id.toUpperCase())+'</span><small>00:12</small></button>';
    }).join("");
    $("#leftStatus").textContent=Object.keys(state.comps).length+" compositions";
    var compName=(labels[state.comp] || state.comp.toUpperCase()).replace(/^\d+ \/ /,"");
    $("#compTabName").textContent=compName;
    $("#compBreadcrumb").textContent=compName;
    $("#timelineCompName").textContent=compName;
    $("#projectName").textContent=(CONFIG.name || "CREATOR SPACE").toUpperCase();
    $("#projectTitleMini").textContent=(CONFIG.name || "CREATOR SPACE").toUpperCase().replace(/[^A-Z0-9]+/g,"_")+".aep";
  }
  function drawAssets(){
    $("#assetCount").textContent=state.assets.length+" ITEMS";
    $("#assetList").innerHTML=state.assets.length ? state.assets.map(function(a,i){
      return '<button type="button" class="asset-item" data-asset="'+i+'" title="Add to composition"><i>▣</i><span>'+esc(a.name)+'</span></button>';
    }).join("") : '<div class="empty-assets">Drag a JPG or PNG here<br>or click <button id="importInline">Import File</button></div>';
  }
  function drawTimeline(){
    var layers=currentLayers();
    $("#layerRows").innerHTML=layers.map(function(l,i){
      var sel=l.id===state.selected?"selected":"";
      var typ={text:"T",shape:"◯",solid:"▣",image:"▧"}[l.type]||"◩";
      return '<div draggable="true" class="layer-row '+sel+'" data-row="'+esc(l.id)+'">'+
        '<span class="layer-number">'+String(i+1).padStart(2,"0")+'</span><span class="layer-type">'+typ+'</span>'+
        '<span class="layer-name" title="Double-click to rename">'+esc(l.name)+'</span>'+
        '<button class="layer-toggle '+(l.visible?"on":"muted")+'" data-toggle="visible" title="Toggle visibility">'+(l.visible?"◉":"◎")+'</button>'+
        '<button class="layer-toggle '+(l.solo?"on":"muted")+'" data-toggle="solo" title="Solo layer">S</button>'+
        '<button class="layer-toggle '+(l.locked?"on":"muted")+'" data-toggle="locked" title="Lock layer">'+(l.locked?"▣":"♧")+'</button></div>';
    }).join("");
    var tracks=$("#trackRows");
    tracks.innerHTML=layers.map(function(l){
      var ks=[];
      Object.keys(l.keys || {}).forEach(function(p){(l.keys[p]||[]).forEach(function(k){ks.push(k.t);});});
      var times=Array.from(new Set(ks.map(function(t){return Number(t).toFixed(3);})));
      return '<div class="track-row '+(l.id===state.selected?"selected":"")+'" data-track="'+esc(l.id)+'">'+
        '<div class="track-fill '+esc(l.type)+'" style="width:100%"></div>'+
        times.map(function(t){return '<button class="keyframe-dot" title="Keyframe at '+Number(t).toFixed(2)+'s" data-keytime="'+esc(t)+'" style="left:'+(Number(t)/DURATION*100)+'%"></button>';}).join("")+
        '</div>';
    }).join("");
    $("#timelineFooterLayers").textContent=layers.length;
    drawRuler();
    drawPlayhead();
  }
  function drawRuler(){
    var ruler=$("#timeRuler"), width=ruler.clientWidth || 700, zoom=state.zoom/100;
    var html="";
    for (var i=0;i<=DURATION;i++){
      var left=i/DURATION*100*zoom;
      if (left>100.1) break;
      html+='<span class="time-tick" style="left:'+left+'%">'+String(i).padStart(2,"0")+':00</span>';
      if(i<DURATION)for(var k=1;k<4;k++){
        var minor=(i+k/4)/DURATION*100*zoom;
        if(minor<=100)html+='<span class="time-minor" style="left:'+minor+'%"></span>';
      }
    }
    ruler.innerHTML=html;
  }
  function drawPlayhead(){
    var v=state.time/DURATION*100*state.zoom/100;
    $("#playhead").style.left=v+"%";
    var time=fmtTime(state.time);
    $("#timelineTime").textContent=time;
    $("#viewerTime").textContent=time;
    $("#timelineZoomLabel").textContent=state.zoom+"%";
  }
  function drawInspector(){
    var l=currentLayer();
    $("#selectedLayerName").textContent=l?l.name:"NO SELECTION";
    if (!l) {
      $("#inspectorContent").innerHTML='<div class="inspector-empty">Select a layer in the composition<br>or timeline to edit properties.</div>';
      return;
    }
    var p='<div class="prop-header"><span>⌄</span>'+esc(l.name)+'</div>';
    if (l.type==="text") {
      p+='<div class="prop-section"><div class="prop-section-title">Source Text <span>T</span></div>'+
       '<div class="prop-row"><label>Text</label><input style="width:145px;text-align:left" type="text" maxlength="600" data-prop="text" value="'+esc(l.text.replace(/\n/g," / "))+'"></div>'+
       '<div class="prop-row"><label>Font Size</label><input type="number" min="0.5" max="20" step="0.2" data-prop="size" value="'+l.size+'"></div>'+
       '<div class="prop-row"><label>Weight</label><input type="number" min="100" max="900" step="100" data-prop="weight" value="'+l.weight+'"></div></div>';
    }
    p+='<div class="prop-section"><div class="prop-section-title">⌄ Transform <span>◆ keyframe</span></div>';
    [["x","Position X","%"],["y","Position Y","%"],["scale","Scale","%"],["rotation","Rotation","°"],["opacity","Opacity","%"]].forEach(function(a){
      p+='<div class="prop-row"><label>'+a[1]+'</label><input type="number" step="1" data-prop="'+a[0]+'" value="'+Number(valAt(l,a[0])).toFixed(1)+'"><button data-keyprop="'+a[0]+'" title="Set keyframe at current time">◆</button></div>';
    });
    p+='</div><div class="prop-section"><div class="prop-section-title">⌄ Appearance</div>'+
      '<div class="prop-row"><label>Color</label><input type="color" data-prop="color" value="'+esc(l.color)+'"></div>'+
      '<div class="prop-row"><label>Width (%)</label><input type="number" min="1" max="150" data-prop="width" value="'+l.width+'"></div></div>';
    p+='<div class="prop-section"><div class="prop-section-title">⌄ Effects</div>';
    ["glow","blur","shadow","saturate"].forEach(function(f){
      p+='<div class="prop-row"><label>'+{glow:"Glow",blur:"Gaussian Blur",shadow:"Drop Shadow",saturate:"Saturation"}[f]+'</label><input type="checkbox" data-effect-check="'+f+'" '+(l.effects&&l.effects[f]?"checked":"")+'></div>';
    });
    p+='<div class="prop-desc">Select a property and press ◆ to add a keyframe at the current time. Values interpolate between keyframes.</div></div>';
    $("#inspectorContent").innerHTML=p;
  }
  function renderAll(){
    drawProjectTree();drawAssets();drawTimeline();drawInspector();drawStage();drawPlayhead();
  }
  function chooseLayer(id){
    state.selected=id;
    state.activeProp="opacity";
    drawTimeline();drawInspector();drawStage();
  }
  function chooseComp(id) {
    if(!state.comps[id])return;
    pause();state.comp=id;state.time=2.3;state.selected=null;
    renderAll();queueSave();
  }
  function addLayer(type){
    var name,options={};
    if(type==="text"){name="New Text "+String(currentLayers().length+1);options={text:"YOUR TEXT HERE",size:5.5,width:70,color:"#f7f4ff"};}
    else if(type==="shape"){name="Shape Layer "+String(currentLayers().length+1);options={width:25,color:"#a492ef",opacity:80};}
    else{name="Solid "+String(currentLayers().length+1);options={width:45,color:"#6652b8",opacity:85};}
    var layer=mk(type,name,50,50,options);
    currentLayers().unshift(layer);state.selected=layer.id;
    renderAll();queueSave();toast(type.toUpperCase()+" layer created");
  }
  function deleteSelected(){
    if(!state.selected)return toast("Select a layer first.");
    var l=currentLayer();
    if(l && l.locked)return toast("Unlock the layer to delete it.");
    state.comps[state.comp]=currentLayers().filter(function(x){return x.id!==state.selected;});
    state.selected=null;renderAll();queueSave();toast("Layer deleted");
  }
  function setTime(t){
    state.time=clamp(Math.round(clamp(t,0,DURATION)*FPS)/FPS,0,DURATION);
    drawPlayhead();drawStage();
  }
  function togglePlay(){
    if(state.playing){pause();return;}
    if(state.time >= DURATION - 1/FPS) setTime(0);
    state.playing=true;lastFrame=0;updatePlayButtons();
    raf=requestAnimationFrame(tick);
  }
  function tick(ts){
    if(!state.playing)return;
    if(lastFrame)state.time+=Math.min(.07,(ts-lastFrame)/1000);
    lastFrame=ts;
    if(state.time>=DURATION)state.time=0;
    drawPlayhead();drawStage();
    raf=requestAnimationFrame(tick);
  }
  function pause(){state.playing=false;cancelAnimationFrame(raf);lastFrame=0;updatePlayButtons();}
  function updatePlayButtons(){
    var txt=state.playing?"❚❚":"▶";
    ["#playToggle","#previewToggle"].forEach(function(id){var e=$(id);if(e)e.textContent=txt;});
  }
  function addKey(prop){
    var layer=currentLayer();
    if(!layer)return toast("Select a layer to create a keyframe.");
    if(layer.locked)return toast("Unlock the layer to edit.");
    prop=prop||state.activeProp||"opacity";
    if(!["x","y","opacity","scale","rotation"].includes(prop))prop="opacity";
    if(!layer.keys)layer.keys={};
    if(!layer.keys[prop])layer.keys[prop]=[];
    var value=valAt(layer,prop), existing=layer.keys[prop].find(function(k){return Math.abs(k.t-state.time)<.01;});
    if(existing)existing.v=value;else layer.keys[prop].push({t:state.time,v:value});
    layer.keys[prop].sort(function(a,b){return a.t-b.t;});
    drawTimeline();drawInspector();queueSave();toast("◆ "+prop.toUpperCase()+" keyframe at "+state.time.toFixed(2)+"s");
  }
  function changeProp(prop,value){
    var layer=currentLayer();if(!layer || layer.locked)return;
    if(prop==="text"){layer.text=String(value).replace(/ \/ /g,"\n");layer.name="Text / "+layer.text.replace(/\n/g," ").slice(0,24);}
    else if(prop==="color"){if(/^#[a-fA-F0-9]{6}$/.test(value))layer.color=value;}
    else if(["x","y","opacity","rotation","scale","size","weight","width"].includes(prop)){
      var n=Number(value);if(!Number.isFinite(n))return;
      if(prop==="opacity")n=clamp(n,0,100);
      if(prop==="scale")n=clamp(n,1,500);
      if(prop==="size")n=clamp(n,.5,20);
      if(prop==="width")n=clamp(n,1,150);
      if(["x","y","opacity","rotation","scale"].includes(prop)&&Array.isArray(layer.keys&&layer.keys[prop])&&layer.keys[prop].length){
        var found=layer.keys[prop].find(function(k){return Math.abs(k.t-state.time)<.02;});
        if(found)found.v=n;else layer.keys[prop].push({t:state.time,v:n});
      } else layer[prop]=n;
    }
    drawStage();drawTimeline();queueSave();
    if(prop==="text"){$("#selectedLayerName").textContent=layer.name;}
  }
  function showAbout(){
    var name=CONFIG.name || "CREATOR SPACE";
    $("#aboutName").textContent=name;
    $("#aboutDescription").textContent=CONFIG.description || CONFIG.tagline || "Motion design and creative experiments.";
    $("#sideCreator").textContent=name;
    $("#sideTagline").textContent=CONFIG.tagline || "Motion design and creative experiments.";
    var links=[
      ["DISCORD",CONFIG.discord],
      ["PERSONAL TELEGRAM",CONFIG.telegram],
      ["TELEGRAM CHANNEL",CONFIG.telegramChannel],
      ["MAIN WEBSITE",CONFIG.mainSite],
      ["GITHUB",CONFIG.github],
      ["EMAIL",CONFIG.email ? "mailto:"+CONFIG.email : ""]
    ];
    $("#aboutLinks").innerHTML=links.map(function(l){
      var url=l[1] || "";
      var safe=/^(https:\/\/|mailto:)/i.test(url);
      return safe ? '<a class="about-link" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+l[0]+' <span class="link-arrow">↗</span></a>'
        : '<span class="about-link disabled" title="Add this link in site-config.js">'+l[0]+' · SOON</span>';
    }).join("");
    var dialog=$("#aboutDialog");
    if(!dialog.open)dialog.showModal();
  }
  function hideAbout(){var d=$("#aboutDialog");if(d.open)d.close();}
  function importMedia(files){
    var list=Array.from(files||[]).filter(function(f){return /^image\/(jpeg|png|webp|gif)$/.test(f.type);}).slice(0,10);
    if(!list.length)return toast("Choose a JPG, PNG, WEBP or GIF image.");
    list.forEach(function(file){
      if(file.size>3*1024*1024)return toast("Image must be smaller than 3 MB.");
      var reader=new FileReader();
      reader.onload=function(){
        state.assets.push({name:file.name.slice(0,80),url:String(reader.result)});
        drawAssets();queueSave();toast("Imported "+file.name);
      };
      reader.readAsDataURL(file);
    });
  }
  function addAsset(index){
    var asset=state.assets[index];if(!asset)return;
    var layer=mk("image",asset.name,50,50,{width:48,image:asset.url});
    currentLayers().unshift(layer);state.selected=layer.id;
    renderAll();queueSave();toast("Image added to composition");
  }
  function exportProject(){
    pause();
    var data={version:1,comp:state.comp,comps:state.comps,assets:state.assets,exported:new Date().toISOString()};
    var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var anchor=document.createElement("a");anchor.href=url;anchor.download="ae-workspace-project.json";anchor.click();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);toast("Project exported as JSON");
  }
  function importProject(file){
    if(!file)return;
    if(file.size>9*1024*1024)return toast("JSON file is too large.");
    var fr=new FileReader();
    fr.onload=function(){
      try{
        var data=JSON.parse(fr.result);
        if(!data||!data.comps||!Object.keys(data.comps).length)throw Error("Invalid project");
        pause();state.comps=sanitizeComps(data.comps);
        state.assets=Array.isArray(data.assets)?data.assets.slice(0,30).filter(function(a){return a && /^data:image\//.test(a.url||"");}):[];
        state.comp=state.comps[data.comp]?data.comp:Object.keys(state.comps)[0];
        state.selected=null;state.time=0;renderAll();queueSave();toast("Project imported successfully");
      }catch(e){toast("Could not read project JSON.");}
    };
    fr.readAsText(file);
  }
  function resetProject(){
    if(!confirm("Reset all compositions and layers? This clears the local saved project."))return;
    pause();state.comps=buildDefaults();state.assets=[];state.comp="intro";state.selected=null;state.time=0;
    renderAll();saveProject();toast("Project reset to default");
  }
  function newComp(){
    var id="comp_"+Math.floor(Date.now()/1000);
    state.comps[id]=[mk("text","NEW COMPOSITION",50,50,{text:"NEW COMPOSITION",size:7,color:"#ece7ff",width:80})];
    chooseComp(id);toast("New composition added");
  }
  function menuData(name){
    var menus={
      file:[["New Composition","Ctrl+N","newComp"],["Import Image","Ctrl+I","import"],["Import Project JSON","","importProject"],["Export Project JSON","Ctrl+S","export"],["Reset Project","","reset"]],
      edit:[["Add Text Layer","T","text"],["Add Shape Layer","S","shape"],["Delete Selected Layer","Del","delete"],["Duplicate Selected Layer","Ctrl+D","duplicate"]],
      composition:[["01 / Intro Sequence","","intro"],["02 / About Creator","","social"],["03 / Showreel","","showreel"],["New Composition","","newComp"]],
      layer:[["New Text Layer","","text"],["New Shape Layer","","shape"],["New Solid","","solid"],["Add Keyframe","◆","key"],["Delete Layer","","delete"]],
      effect:[["Glow","","fx-glow"],["Gaussian Blur","","fx-blur"],["Drop Shadow","","fx-shadow"],["Hue / Saturation","","fx-saturate"],["Reset Effects","","fx-reset"]],
      animation:[["Play / Pause","Space","play"],["Go to Beginning","","start"],["Add Keyframe","","key"]],
      view:[["Toggle Guides","","guides"],["Toggle Safe Margins","","safe"],["Fit Composition","","fit"]],
      window:[["Project Panel","","project"],["Effects & Presets","","effects"],["Properties","","properties"],["Info","","info"],["Creator Contacts","","about"],["Reset Layout","","layout"]],
      help:[["About this website","","about"],["Keyboard Shortcuts","","help"],["Personal Links","","about"]]
    };
    return menus[name] || [];
  }
  function execute(action){
    if(!action)return;
    if(action==="import")$("#mediaInput").click();
    else if(action==="importProject")$("#jsonInput").click();
    else if(action==="export")exportProject();
    else if(action==="reset")resetProject();
    else if(action==="newComp")newComp();
    else if(action==="text"||action==="shape"||action==="solid")addLayer(action);
    else if(action==="delete")deleteSelected();
    else if(action==="duplicate")duplicate();
    else if(action==="key")addKey();
    else if(action==="intro"||action==="social"||action==="showreel")chooseComp(action);
    else if(action==="play")togglePlay();
    else if(action==="start")setTime(0);
    else if(action==="guides")toggleGuides();
    else if(action==="safe")toggleSafe();
    else if(action==="fit"){state.zoom=100;drawRuler();drawPlayhead();}
    else if(action==="about")showAbout();
    else if(action==="help")toast("Space: play • T: text • S: shape • Arrows: scrub • Delete: remove • Ctrl+S: export");
    else if(action==="layout")resetLayout();
    else if(action==="project"||action==="effects")chooseLeftTab(action);
    else if(action==="properties"||action==="info"||action==="preview")chooseRightTab(action);
    else if(action.indexOf("fx-")===0)applyEffect(action.slice(3));
  }
  function duplicate(){
    var l=currentLayer();if(!l)return toast("Select a layer to duplicate.");
    var copy=JSON.parse(JSON.stringify(l));copy.id=newId();copy.name=l.name+" copy";copy.x+=3;copy.y+=4;
    currentLayers().unshift(copy);state.selected=copy.id;renderAll();queueSave();toast("Layer duplicated");
  }
  function applyEffect(effect){
    var l=currentLayer();if(!l)return toast("Select a layer first.");
    if(l.locked)return toast("Unlock the layer to edit.");
    l.effects=l.effects||{};
    if(effect==="reset")l.effects={};else l.effects[effect]=!l.effects[effect];
    drawInspector();drawStage();queueSave();toast(effect==="reset"?"Effects cleared":effect.toUpperCase()+" toggled");
  }
  function toggleGuides(){state.grid=!state.grid;$("#gridButton").classList.toggle("active",state.grid);drawStage();}
  function toggleSafe(){state.safe=!state.safe;$("#safeButton").classList.toggle("active",state.safe);drawStage();}
  function toggleChecker(){state.checker=!state.checker;$("#checkerButton").classList.toggle("active",state.checker);$("#transparencyButton").classList.toggle("active",state.checker);drawStage();}
  function chooseLeftTab(which){
    state.leftTab=which;
    $$("[data-left-tab]").forEach(function(t){t.classList.toggle("active",t.dataset.leftTab===which);});
    $("#projectPane").classList.toggle("hidden",which!=="project");
    $("#effectsPane").classList.toggle("hidden",which!=="effects");
  }
  function chooseRightTab(which){
    state.rightTab=which;
    $$("[data-right-tab]").forEach(function(t){t.classList.toggle("active",t.dataset.rightTab===which);});
    ["properties","info","preview"].forEach(function(t){$("#"+t+"Pane").classList.toggle("hidden",which!==t);});
  }
  function drawMenu(name,button){
    var pop=$("#menuPopover");var wasVisible=!pop.classList.contains("hidden");
    if(wasVisible && pop.dataset.menu===name){closeMenu();return;}
    $$("[data-menu]").forEach(function(b){b.classList.toggle("open",b===button);});
    var buttons=menuData(name);
    pop.innerHTML=buttons.map(function(x){return '<button data-action="'+esc(x[2])+'">'+esc(x[0])+'<small>'+esc(x[1])+'</small></button>';}).join("");
    pop.dataset.menu=name;pop.style.left=clamp(button.getBoundingClientRect().left-8,0,window.innerWidth-260)+"px";
    pop.classList.remove("hidden");
  }
  function closeMenu(){$("#menuPopover").classList.add("hidden");$$("[data-menu]").forEach(function(b){b.classList.remove("open");});}
  function resetLayout(){
    var studio=$("#studio");
    studio.style.setProperty("--left-width","var(--left)");
    studio.style.setProperty("--right-width","var(--right)");
    studio.style.setProperty("--timeline-height","var(--timeline)");
    $("#layerRows").parentNode.style.width="";
    localStorage.removeItem(LAYOUT_KEY);
    drawRuler();drawStage();toast("Workspace layout restored");
  }
  function restoreLayout(){
    try{
      var d=JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
      var studio=$("#studio");
      if(d.left)studio.style.setProperty("--left-width",clamp(d.left,170,480)+"px");
      if(d.right)studio.style.setProperty("--right-width",clamp(d.right,170,480)+"px");
      if(d.timeline)studio.style.setProperty("--timeline-height",clamp(d.timeline,175,500)+"px");
    }catch(e){}
  }
  function setupResizers(){
    $$("[data-resize]").forEach(function(handle){
      handle.addEventListener("pointerdown",function(e){
        e.preventDefault();handle.setPointerCapture(e.pointerId);handle.classList.add("dragging");
        var rect=$("#studio").getBoundingClientRect();
        var which=handle.dataset.resize;
        function move(ev){
          if(which==="left")$("#studio").style.setProperty("--left-width",clamp(ev.clientX-rect.left,170,Math.min(480,rect.width*.4))+"px");
          if(which==="right")$("#studio").style.setProperty("--right-width",clamp(rect.right-ev.clientX,170,Math.min(480,rect.width*.4))+"px");
          if(which==="timeline")$("#studio").style.setProperty("--timeline-height",clamp(rect.bottom-ev.clientY,175,Math.min(500,rect.height*.7))+"px");
          drawRuler();drawPlayhead();drawStage();
        }
        function up(){
          handle.classList.remove("dragging");handle.removeEventListener("pointermove",move);handle.removeEventListener("pointerup",up);
          var st=getComputedStyle($("#studio"));
          try{localStorage.setItem(LAYOUT_KEY,JSON.stringify({left:parseFloat(st.getPropertyValue("--left-width")),right:parseFloat(st.getPropertyValue("--right-width")),timeline:parseFloat(st.getPropertyValue("--timeline-height"))}));}catch(e){}
        }
        handle.addEventListener("pointermove",move);handle.addEventListener("pointerup",up);
      });
    });
  }
  function installEvents(){
    $("#openAboutTop").addEventListener("click",showAbout);
    ["#topSocials","#rightOpenSocials","#footerContacts"].forEach(function(s){$(s).addEventListener("click",showAbout);});
    $("#closeAbout").addEventListener("click",hideAbout);
    $("#aboutDialog").addEventListener("click",function(e){if(e.target===this)hideAbout();});
    $("#playToggle").addEventListener("click",togglePlay);
    $("#previewToggle").addEventListener("click",togglePlay);
    $("#goBeginning").addEventListener("click",function(){pause();setTime(0);});
    $("#goStart").addEventListener("click",function(){pause();setTime(0);});
    $("#goEnd").addEventListener("click",function(){pause();setTime(DURATION);});
    ["#prevFrame","#stepBack"].forEach(function(id){$(id).addEventListener("click",function(){pause();setTime(state.time-1/FPS);});});
    ["#nextFrame","#stepNext"].forEach(function(id){$(id).addEventListener("click",function(){pause();setTime(state.time+1/FPS);});});
    ["#addTextButton","#textTool"].forEach(function(id){$(id).addEventListener("click",function(){addLayer("text");});});
    ["#addShapeButton","#shapeTool"].forEach(function(id){$(id).addEventListener("click",function(){addLayer("shape");});});
    $("#addSolidButton").addEventListener("click",function(){addLayer("solid");});
    $("#addKeyButton").addEventListener("click",function(){addKey();});
    $("#deleteLayerButton").addEventListener("click",deleteSelected);
    $("#saveButton").addEventListener("click",exportProject);
    ["#importButton","#newFolderButton"].forEach(function(id){$(id).addEventListener("click",function(){$("#mediaInput").click();});});
    $("#mediaInput").addEventListener("change",function(){importMedia(this.files);this.value="";});
    $("#jsonInput").addEventListener("change",function(){importProject(this.files[0]);this.value="";});
    $("#newCompButton").addEventListener("click",newComp);
    $("#resetWorkspace").addEventListener("click",resetLayout);
    $("#gridButton").addEventListener("click",toggleGuides);
    $("#safeButton").addEventListener("click",toggleSafe);
    $("#checkerButton").addEventListener("click",toggleChecker);
    $("#transparencyButton").addEventListener("click",toggleChecker);
    $("#zoomButton").addEventListener("click",function(){var values=[100,75,50,125,150];state.stageZoom=values[(values.indexOf(state.stageZoom)+1)%values.length];drawStage();toast("Viewer zoom: "+state.stageZoom+"%");});
    $("#resButton").addEventListener("click",function(){var values=["Full","Half","Quarter"];state.quality=values[(values.indexOf(state.quality)+1)%values.length];drawStage();toast("Preview quality: "+state.quality);});
    $("#timelineZoomOut").addEventListener("click",function(){state.zoom=clamp(state.zoom-25,50,200);drawRuler();drawPlayhead();});
    $("#timelineZoomIn").addEventListener("click",function(){state.zoom=clamp(state.zoom+25,50,200);drawRuler();drawPlayhead();});
    $("#selectTool").addEventListener("click",function(){state.tool="select";$("#selectTool").classList.add("active");$("#handTool").classList.remove("active");});
    $("#handTool").addEventListener("click",function(){state.tool="hand";$("#handTool").classList.add("active");$("#selectTool").classList.remove("active");toast("Hand tool active (click selection to resume)");});
    $$("[data-left-tab]").forEach(function(b){b.addEventListener("click",function(){chooseLeftTab(b.dataset.leftTab);});});
    $$("[data-right-tab]").forEach(function(b){b.addEventListener("click",function(){chooseRightTab(b.dataset.rightTab);});});
    $("#projectTree").addEventListener("click",function(e){
      var b=e.target.closest("[data-comp]");if(b)chooseComp(b.dataset.comp);
    });
    $("#assetList").addEventListener("click",function(e){
      var b=e.target.closest("[data-asset]");if(b)addAsset(Number(b.dataset.asset));
      else if(e.target.closest("#importInline"))$("#mediaInput").click();
    });
    $("#effectsCatalog").addEventListener("click",function(e){
      var b=e.target.closest("[data-effect]");if(b)applyEffect(b.dataset.effect);
    });
    $("#effectSearch").addEventListener("input",function(){
      var q=this.value.trim().toLowerCase();
      $$(".effect-row").forEach(function(b){b.classList.toggle("hidden",!!q&&!b.textContent.toLowerCase().includes(q));});
    });
    $("#layerRows").addEventListener("click",function(e){
      var row=e.target.closest("[data-row]");if(!row)return;
      var l=currentLayers().find(function(x){return x.id===row.dataset.row;});if(!l)return;
      var toggle=e.target.closest("[data-toggle]");
      if(toggle){
        var prop=toggle.dataset.toggle;l[prop]=!l[prop];renderAll();queueSave();return;
      }
      chooseLayer(l.id);
    });
    $("#layerRows").addEventListener("dblclick",function(e){
      var row=e.target.closest("[data-row]");if(!row)return;
      var l=currentLayers().find(function(x){return x.id===row.dataset.row;});if(!l)return;
      var input=prompt("Rename layer:",l.name);
      if(input&&input.trim()){l.name=input.trim().slice(0,100);renderAll();queueSave();}
    });
    var dragRowId=null;
    $("#layerRows").addEventListener("dragstart",function(e){
      var row=e.target.closest("[data-row]");if(!row)return;
      dragRowId=row.dataset.row;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragRowId);
    });
    $("#layerRows").addEventListener("dragover",function(e){
      var row=e.target.closest("[data-row]");if(!row)return;
      e.preventDefault();row.classList.add("drag-over");
    });
    $("#layerRows").addEventListener("dragleave",function(e){var row=e.target.closest("[data-row]");if(row)row.classList.remove("drag-over");});
    $("#layerRows").addEventListener("drop",function(e){
      var row=e.target.closest("[data-row]");if(!row)return;
      e.preventDefault();var target=row.dataset.row;
      if(dragRowId&&dragRowId!==target){
        var ls=currentLayers(),from=ls.findIndex(function(l){return l.id===dragRowId;}),to=ls.findIndex(function(l){return l.id===target;});
        if(from>=0&&to>=0){ls.splice(to,0,ls.splice(from,1)[0]);drawTimeline();drawStage();queueSave();}
      }
      dragRowId=null;
    });
    $("#trackRows").addEventListener("click",function(e){
      var key=e.target.closest("[data-keytime]");
      if(key){pause();setTime(Number(key.dataset.keytime));e.stopPropagation();return;}
      var row=e.target.closest("[data-track]");if(row)chooseLayer(row.dataset.track);
    });
    $("#inspectorContent").addEventListener("focusin",function(e){if(e.target.dataset.prop)state.activeProp=e.target.dataset.prop;});
    $("#inspectorContent").addEventListener("input",function(e){
      var el=e.target;
      if(el.dataset.prop)changeProp(el.dataset.prop,el.value);
      else if(el.dataset.effectCheck)applyEffect(el.dataset.effectCheck);
    });
    $("#inspectorContent").addEventListener("click",function(e){var b=e.target.closest("[data-keyprop]");if(b)addKey(b.dataset.keyprop);});
    $("#menuItems").addEventListener("click",function(e){
      var menu=e.target.closest("[data-menu]");if(menu)drawMenu(menu.dataset.menu,menu);
    });
    $("#menuPopover").addEventListener("click",function(e){
      var action=e.target.closest("[data-action]");if(action){closeMenu();execute(action.dataset.action);}
    });
    document.addEventListener("pointerdown",function(e){
      if(!e.target.closest(".menu-bar"))closeMenu();
    });
    function pointerTime(e){
      var rect=$("#timeRuler").getBoundingClientRect();
      setTime((e.clientX-rect.left)/rect.width*DURATION*100/state.zoom);
    }
    $("#timeRuler").addEventListener("pointerdown",function(e){
      e.preventDefault();pause();pointerTime(e);
      var ruler=this;ruler.setPointerCapture(e.pointerId);
      function move(ev){pointerTime(ev);}function up(){ruler.removeEventListener("pointermove",move);ruler.removeEventListener("pointerup",up);}
      ruler.addEventListener("pointermove",move);ruler.addEventListener("pointerup",up);
    });
    $("#compositionFrame").addEventListener("pointerdown",function(e){
      var node=e.target.closest("[data-layer-id]");
      if(!node){if(state.tool!=="hand")chooseLayer(null);return;}
      if(state.tool==="hand"){
        dragging={hand:true,clientX:e.clientX,clientY:e.clientY,x:state.panX,y:state.panY};
        $("#compositionFrame").setPointerCapture(e.pointerId);
        return;
      }
      var l=currentLayers().find(function(x){return x.id===node.dataset.layerId;});if(!l)return;
      chooseLayer(l.id);
      if(l.locked)return;
      pause();dragging={id:l.id,clientX:e.clientX,clientY:e.clientY,x:valAt(l,"x"),y:valAt(l,"y")};
      $("#compositionFrame").setPointerCapture(e.pointerId);
    });
    $("#compositionFrame").addEventListener("pointermove",function(e){
      if(!dragging)return;
      if(dragging.hand){
        state.panX=dragging.x+(e.clientX-dragging.clientX);
        state.panY=dragging.y+(e.clientY-dragging.clientY);
        refreshViewer();return;
      }
      var l=currentLayers().find(function(x){return x.id===dragging.id;});
      if(!l)return;
      var rect=this.getBoundingClientRect();
      var x=clamp(dragging.x+(e.clientX-dragging.clientX)/rect.width*100,-30,130);
      var y=clamp(dragging.y+(e.clientY-dragging.clientY)/rect.height*100,-30,130);
      ["x","y"].forEach(function(prop){
        var n=prop==="x"?x:y;
        if(Array.isArray(l.keys[prop])&&l.keys[prop].length){
          var point=l.keys[prop].find(function(k){return Math.abs(k.t-state.time)<.02;});
          if(point)point.v=n;else l.keys[prop].push({t:state.time,v:n});
        }else l[prop]=n;
      });
      drawStage();queueSave();
    });
    function stopDrag(){if(!dragging)return;dragging=null;drawInspector();drawTimeline();}
    $("#compositionFrame").addEventListener("pointerup",stopDrag);
    $("#compositionFrame").addEventListener("pointercancel",stopDrag);
    $("#compositionFrame").addEventListener("dblclick",function(e){
      if(e.target.closest("[data-layer-id]") && state.comp==="social")showAbout();
    });
    ["dragenter","dragover"].forEach(function(event){
      $("#viewer").addEventListener(event,function(e){e.preventDefault();e.dataTransfer.dropEffect="copy";});
    });
    $("#viewer").addEventListener("drop",function(e){e.preventDefault();if(e.dataTransfer.files.length)importMedia(e.dataTransfer.files);});
    document.addEventListener("keydown",function(e){
      var inField=e.target.matches("input,textarea,[contenteditable]")||e.target.closest("dialog[open]");
      if(e.key==="Escape"){closeMenu();hideAbout();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();exportProject();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="i"){e.preventDefault();$("#mediaInput").click();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="n"){e.preventDefault();newComp();return;}
      if(inField)return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"){e.preventDefault();duplicate();return;}
      if(e.code==="Space"){e.preventDefault();togglePlay();}
      else if(e.key==="ArrowRight"){e.preventDefault();pause();setTime(state.time+(e.shiftKey?10:1)/FPS);}
      else if(e.key==="ArrowLeft"){e.preventDefault();pause();setTime(state.time-(e.shiftKey?10:1)/FPS);}
      else if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();deleteSelected();}
      else if(e.key.toLowerCase()==="t"&&!e.ctrlKey&&!e.metaKey)addLayer("text");
      else if(e.key.toLowerCase()==="s"&&!e.ctrlKey&&!e.metaKey)addLayer("shape");
    });
    document.addEventListener("visibilitychange",function(){if(document.hidden)pause();});
    window.addEventListener("resize",function(){drawStage();drawRuler();drawPlayhead();});
    if(typeof ResizeObserver!=="undefined"){
      new ResizeObserver(function(){drawStage();drawRuler();drawPlayhead();}).observe($("#compositionFrame"));
    }
  }
  function start(){
    restoreProject();restoreLayout();installEvents();
    $("#sideCreator").textContent=CONFIG.name || "YOUR CREATIVE SPACE";
    $("#sideTagline").textContent=CONFIG.tagline || "Motion design and experiments.";
    renderAll();setTime(2.3);
    if(!sessionStorage.getItem("ae-welcome")){sessionStorage.setItem("ae-welcome","yes");setTimeout(function(){toast("Welcome to the workspace • SPACE to play • click FIND ME ONLINE to connect");},750);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();