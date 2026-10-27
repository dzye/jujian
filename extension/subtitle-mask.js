(() => {
  if (window.__jujianSubtitleMask) return;
  window.__jujianSubtitleMask = true;
  const key = `mask:${location.hostname}`;
  const defaults = {x:.18,y:.82,w:.64,h:.065,opacity:.95,color:'#181818'};
  let state = {...defaults,enabled:false,editing:false}, video, host, box, toolbar, peek=false, drag, timer;
  const ready = chrome.storage.local.get(key).then(data => {Object.assign(state,data[key] || {});});
  function videos(root=document) {
    const found=[...root.querySelectorAll('video,bwp-video')];
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) found.push(...videos(el.shadowRoot));
    return found;
  }
  function selectVideo() {
    return videos().filter(v=>{const r=v.getBoundingClientRect();return r.width>100&&r.height>60&&r.bottom>0&&r.top<innerHeight;})
      .sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return br.width*br.height-ar.width*ar.height;})[0];
  }
  function save() {clearTimeout(timer);timer=setTimeout(()=>{const {enabled,editing,...settings}=state;chrome.storage.local.set({[key]:settings});},150);}
  function mount() {
    if(host)return;
    host=document.createElement('div');host.id='jujian-mask-extension';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>:host{all:initial}.mask{position:absolute;box-sizing:border-box;touch-action:none}.editing{outline:2px solid #b9e587;cursor:move;pointer-events:auto}.handle{position:absolute;width:13px;height:13px;background:#d9f7b8;border:2px solid #27432d;box-sizing:border-box;border-radius:3px}.nw{left:-7px;top:-7px;cursor:nwse-resize}.ne{right:-7px;top:-7px;cursor:nesw-resize}.sw{left:-7px;bottom:-7px;cursor:nesw-resize}.se{right:-7px;bottom:-7px;cursor:nwse-resize}.tools{position:absolute;display:flex;gap:6px;pointer-events:auto;font:12px 'PingFang SC',sans-serif;white-space:nowrap}.tools button{border:1px solid #789365;background:#203c2d;color:#ecf8dc;padding:7px 11px;border-radius:6px;cursor:pointer}.tools span{background:#203c2d;color:#ecf8dc;padding:7px 10px;border-radius:6px}</style><div class="mask"><div class="handle nw" data-corner="nw"></div><div class="handle ne" data-corner="ne"></div><div class="handle sw" data-corner="sw"></div><div class="handle se" data-corner="se"></div></div><div class="tools"><span>拖动移动 · 四角缩放</span><button id="lock">锁定</button><button id="close">关闭</button></div>`;
    box=shadow.querySelector('.mask');toolbar=shadow.querySelector('.tools');
    shadow.getElementById('lock').onclick=()=>{state.editing=false;};
    shadow.getElementById('close').onclick=()=>{state.enabled=false;state.editing=false;};
    box.addEventListener('pointerdown',e=>{
      if(!state.editing || !video)return;
      e.preventDefault();e.stopPropagation();box.setPointerCapture(e.pointerId);
      drag={px:e.clientX,py:e.clientY,start:{...state},rect:video.getBoundingClientRect(),corner:e.target.dataset.corner};
    });
    box.addEventListener('pointermove',e=>{
      if(!drag)return;
      const dx=(e.clientX-drag.px)/drag.rect.width,dy=(e.clientY-drag.py)/drag.rect.height,s=drag.start,c=drag.corner;
      if(!c){state.x=Math.max(0,Math.min(1-s.w,s.x+dx));state.y=Math.max(0,Math.min(1-s.h,s.y+dy));}
      else {
        let left=s.x,right=s.x+s.w,top=s.y,bottom=s.y+s.h;
        if(c.includes('w'))left=Math.max(0,Math.min(right-.03,s.x+dx));else right=Math.min(1,Math.max(left+.03,right+dx));
        if(c.includes('n'))top=Math.max(0,Math.min(bottom-.015,s.y+dy));else bottom=Math.min(1,Math.max(top+.015,bottom+dy));
        Object.assign(state,{x:left,y:top,w:right-left,h:bottom-top});
      }save();
    });
    const stop=()=>{drag=null;};box.addEventListener('pointerup',stop);box.addEventListener('pointercancel',stop);box.addEventListener('lostpointercapture',stop);
  }
  function frame() {
    if(state.enabled){
      if(!video?.isConnected||video.getBoundingClientRect().width<1||video.getBoundingClientRect().height<1)video=selectVideo();
      if(video){
        mount();const full=document.fullscreenElement;
        // A fullscreen video is a replaced element: its children cannot display overlays.
        const parent=full && full.tagName!=='VIDEO' ? full : document.documentElement;
        if(host.parentNode!==parent)parent.append(host);
        const r=video.getBoundingClientRect();
        const visible=r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&(!full||full.tagName!=='VIDEO');
        host.style.display=visible?'block':'none';
        const x=r.left+state.x*r.width,y=r.top+state.y*r.height,w=state.w*r.width,h=state.h*r.height;
        Object.assign(box.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,background:state.color,opacity:peek&&!state.editing?'0':String(state.opacity)});
        box.classList.toggle('editing',state.editing);
        box.querySelectorAll('.handle').forEach(el=>el.style.display=state.editing?'block':'none');
        Object.assign(toolbar.style,{display:state.editing?'flex':'none',left:`${Math.max(8,Math.min(innerWidth-300,x))}px`,top:`${Math.max(8,y-42)}px`});
      }else if(host)host.style.display='none';
    }else if(host)host.style.display='none';
    requestAnimationFrame(frame);
  }
  window.addEventListener('keydown',e=>{if(e.key==='Alt')peek=true;});
  window.addEventListener('keyup',e=>{if(e.key==='Alt')peek=false;});window.addEventListener('blur',()=>{peek=false;drag=null;});
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message.type?.startsWith("learning-")) return;
    ready.then(()=>{
      if(message.type!=='state'&&!video?.isConnected)video=selectVideo();
      if(['toggle','edit','reset'].includes(message.type)&&!video){reply({error:'没有找到可见的视频。请先播放视频，再点击插件。嵌入式跨域播放器暂不支持从外层页面控制。'});return;}
      if(message.type==='toggle'){state.enabled=!state.enabled;if(state.enabled)state.editing=true;else state.editing=false;}
      if(message.type==='edit'){state.enabled=true;state.editing=!state.editing;}
      if(message.type==='reset'){Object.assign(state,defaults,{enabled:true,editing:true});save();}
      if(message.type==='update'){if(typeof message.opacity==='number')state.opacity=Math.max(0,Math.min(1,message.opacity));if(/^#[0-9a-f]{6}$/i.test(message.color||''))state.color=message.color;save();}
      reply({...state});
    });return true;
  });
  requestAnimationFrame(frame);
})();
