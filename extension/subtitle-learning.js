(() => {
  if(window.__jujianSubtitleLearning)return;window.__jujianSubtitleLearning=true;
  let enabled=false,video,host,root,line,card,hover=false,autoPaused=false,pausedVideo=null,selected=null,lastText='',lastUrl='',requestId=0,cue=null;
  let timeline=[],timelineVideoId='',timelineRequest=0,timelineLoading=false,timelineError='正在获取字幕时间轴',lastTimelineAttempt=0,previousButton,nextButton;
  const platform=globalThis.JujianVideoPlatform;
  let timelineMetadata=null,availableTracks=[],selectedTrack='',timelineTerminal=false,lastMediaError='';
  const identity=()=>platform?platform.identity():{platform:'youtube',videoId:new URL(location.href).searchParams.get('v')||'',key:new URL(location.href).searchParams.get('v')||'',supported:/(^|\.)youtube\.com$/.test(location.hostname)};
  const positionKey=identity().platform==='bilibili'?'learningPosition:bilibili':'learningPosition';
  const timelineTools=globalThis.JujianCaptionTimeline;
  let subtitlePosition={x:.08,y:.69},moveDrag=null,controls,moveButton,positionEditing=false;
  const positionReady=chrome.storage.local.get(positionKey).then(data=>{const p=data[positionKey];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))subtitlePosition={x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))};});
  let selectionDrag=null,suppressClick=false,lookupOrigin=null,pointerPosition={x:-1,y:-1};
  window.addEventListener('pointermove',event=>{pointerPosition={x:event.clientX,y:event.clientY};},{capture:true,passive:true});
  function pointerOver(element){if(!element||element.hidden)return false;const rect=element.getBoundingClientRect();return rect.width>0&&rect.height>0&&pointerPosition.x>=rect.left&&pointerPosition.x<=rect.right&&pointerPosition.y>=rect.top&&pointerPosition.y<=rect.bottom;}
  let preferences={hoverPause:true,autoResume:true};
  chrome.storage.local.get('learningPreferences').then(data=>Object.assign(preferences,data.learningPreferences||{}));
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.learningPreferences)Object.assign(preferences,{hoverPause:true,autoResume:true},changes.learningPreferences.newValue||{});if(area==='local'&&changes.translationSources&&selected&&card&&!card.hidden)lookup(selected,lookupOrigin);});
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  function resume(force=false){if((force||preferences.autoResume)&&autoPaused&&pausedVideo?.isConnected&&pausedVideo.paused)pausedVideo.play().catch(()=>{});autoPaused=false;pausedVideo=null;}
  function mount(){
    host=el('div');host.id='jujian-learning-extension';host.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none';root=host.attachShadow({mode:'open'});
    const style=el('style');style.textContent=`:host{all:initial}.line{position:absolute;box-sizing:border-box;padding:12px 18px;background:rgba(17,27,22,.96);color:#f5f5e8;border:1px solid #799764;border-radius:10px;text-align:center;font:22px/1.6 Georgia,serif;pointer-events:auto;box-shadow:0 6px 24px #0005}.word{font:inherit;color:inherit;background:none;border:0;border-radius:4px;padding:0 2px;cursor:pointer}.word.is-selected{background:#c4e79a;color:#203b2d}.line{user-select:none;touch-action:none}.word:hover,.word:focus{background:#c4e79a;color:#203b2d;outline:none}.subtitle-controls[hidden]{display:none!important}.subtitle-controls{position:absolute;display:flex;gap:6px;pointer-events:auto}.move-handle{cursor:grab!important;touch-action:none}.move-handle:active{cursor:grabbing!important}.transport{pointer-events:auto;cursor:pointer;border:1px solid #839b6d;background:#203c2d;color:#edf5e3;border-radius:6px;padding:7px 12px;font:12px sans-serif}.line{padding-left:48px;padding-right:48px}.sentence-nav{display:flex;align-items:center;justify-content:center;padding:0;line-height:1;position:absolute;top:50%;transform:translateY(-50%);width:32px;height:36px;background:transparent;border:1px solid #738567;border-radius:6px;color:#edf5df;cursor:pointer;font:22px sans-serif}.sentence-nav:disabled{opacity:.3;cursor:default}.sentence-nav.previous{left:8px}.sentence-nav.next{right:8px}.hint{font:12px/1.5 sans-serif;color:#bbcbac}.card{position:absolute;box-sizing:border-box;width:340px;max-width:calc(100vw - 24px);max-height:55vh;overflow:auto;background:#f7f6ef;color:#263d2d;border:1px solid #bdd0a4;border-radius:12px;box-shadow:0 10px 40px #0006;padding:18px;pointer-events:auto;font:13px/1.7 'PingFang SC',sans-serif}.card h2{font:26px Georgia,serif;margin:0 0 6px}.card p{margin:8px 0}.card button,.card a{cursor:pointer;background:#284c37;color:#f2f6e8;border:0;border-radius:6px;padding:8px 12px;margin:5px 6px 0 0;font:12px sans-serif;text-decoration:none}.muted{font-size:11px;color:#78836e}.card[hidden]{display:none!important}.card{display:flex;flex-direction:column;overflow:hidden}.source-results{overflow-y:auto;min-height:50px;flex:1}.lookup-heading{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px}.lookup-heading h2{overflow-wrap:anywhere;min-width:0}.lookup-heading>button{flex:none}.card button:disabled{opacity:.4;cursor:default}.translation-source{border:1px solid #dfe4d5;border-radius:8px;margin:10px 0;background:#fffef9;position:relative}.source-header{display:flex;align-items:center;padding:3px 6px}.card .source-toggle{flex:1;text-align:left;display:flex;align-items:center;justify-content:space-between;background:transparent;color:#294832;margin:0;font-size:13px;padding:9px 7px}.source-chevron{margin-left:10px;transform:rotate(-90deg)}.source-toggle[aria-expanded=true] .source-chevron{transform:none}.card .source-menu-button{margin:0;background:transparent;color:#738167;font-size:21px;padding:0 8px}.source-body{padding:0 13px 13px;border-top:1px solid #e6e8de}.source-body[hidden],.source-menu[hidden]{display:none!important}.card .source-menu{position:absolute;right:8px;top:37px;z-index:2;background:#f7f6ef;border:1px solid #d5ddc9;padding:6px;border-radius:7px;box-shadow:0 4px 15px #0002}.card .source-menu button{display:block;margin:0;background:transparent;color:#345431;width:100%;text-align:left}.card .source-menu button:hover{background:#e9efdf}.result-chinese{font-size:15px}.lookup-error{color:#9a4d3d}.context-sentence{max-height:55px;overflow:auto;flex-shrink:0;border-top:1px solid #dce1d2;padding-top:12px;font-family:Georgia,serif}.lookup-footer{flex-shrink:0;display:flex;flex-wrap:wrap}.lookup-heading button,.lookup-footer button{font-size:11px!important}.card button:focus-visible{outline:2px solid #88aa68;outline-offset:2px}.meaning{padding:7px 0;border-bottom:1px solid #dedfd4}`;root.append(style);
    line=el('div','','line');card=el('div','','card');card.hidden=true;card.addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});root.append(line,card);controls=el('div','','subtitle-controls');controls.hidden=true;moveButton=el('button','⠿ 拖动调整 · 松开锁定','transport move-handle');moveButton.setAttribute('aria-label','拖动移动英文字幕');moveButton.title='仅在调整模式显示，拖动完成后自动隐藏；Esc 取消调整';controls.append(moveButton);root.append(controls);
    moveButton.addEventListener('pointerdown',e=>{if(e.button!==0||!video||!positionEditing)return;e.preventDefault();e.stopPropagation();const rect=video.getBoundingClientRect();moveDrag={x:e.clientX,y:e.clientY,rect,position:{...subtitlePosition}};moveButton.setPointerCapture(e.pointerId);});
    moveButton.addEventListener('pointermove',e=>{if(!moveDrag)return;const d=moveDrag;subtitlePosition={x:d.position.x+(e.clientX-d.x)/d.rect.width,y:d.position.y+(e.clientY-d.y)/d.rect.height};clampPosition(d.rect);});
    const finishMove=()=>{if(!moveDrag)return;moveDrag=null;positionEditing=false;controls.hidden=true;chrome.storage.local.set({[positionKey]:{...subtitlePosition}});};
    moveButton.addEventListener('pointerup',finishMove);moveButton.addEventListener('pointercancel',finishMove);moveButton.addEventListener('lostpointercapture',finishMove);
    line.addEventListener('pointerdown',e=>{
      const word=e.target.closest('.word');if(e.button!==0||!word)return;
      suppressClick=false;line.querySelectorAll('.is-selected').forEach(w=>w.classList.remove('is-selected'));
      selectionDrag={start:Number(word.dataset.index),end:Number(word.dataset.index),x:e.clientX,y:e.clientY,moved:false,text:lastText,origin:source()};
      line.setPointerCapture(e.pointerId);
    });
    line.addEventListener('pointermove',e=>{
      if(!selectionDrag)return;
      if(Math.hypot(e.clientX-selectionDrag.x,e.clientY-selectionDrag.y)>5)selectionDrag.moved=true;
      const word=root.elementFromPoint(e.clientX,e.clientY)?.closest('.word');
      if(word)selectionDrag.end=Number(word.dataset.index);
      if(selectionDrag.moved){const lo=Math.min(selectionDrag.start,selectionDrag.end),hi=Math.max(selectionDrag.start,selectionDrag.end);line.querySelectorAll('.word').forEach((w,i)=>w.classList.toggle('is-selected',i>=lo&&i<=hi));}
    });
    line.addEventListener('pointerup',e=>{
      const drag=selectionDrag;if(!drag)return;selectionDrag=null;
      if(line.hasPointerCapture(e.pointerId))line.releasePointerCapture(e.pointerId);
      if(drag.moved){suppressClick=true;const words=[...line.querySelectorAll('.word')],lo=Math.min(drag.start,drag.end),hi=Math.max(drag.start,drag.end);const text=drag.text.slice(Number(words[lo].dataset.start),Number(words[hi].dataset.end));lookup(text,drag.origin);}
      else{const word=line.querySelectorAll('.word')[drag.start];suppressClick=true;lookup(word.textContent,drag.origin);}
    });
    line.addEventListener('pointercancel',()=>{selectionDrag=null;suppressClick=true;line.querySelectorAll('.is-selected').forEach(w=>w.classList.remove('is-selected'));});
    host.addEventListener('pointerenter',()=>{},false);
    const enter=event=>{if(event)pointerPosition={x:event.clientX,y:event.clientY};hover=true;if(preferences.hoverPause&&video&&!video.paused){autoPaused=true;pausedVideo=video;video.pause();}};
    const leave=event=>{if(event)pointerPosition={x:event.clientX,y:event.clientY};setTimeout(()=>{hover=pointerOver(line)||pointerOver(card)||pointerOver(controls);if(!hover&&!selectionDrag&&!moveDrag)close();},220);};
    controls.addEventListener('pointerenter',enter);controls.addEventListener('pointerleave',leave);line.addEventListener('pointerenter',enter);card.addEventListener('pointerenter',enter);line.addEventListener('pointerleave',leave);card.addEventListener('pointerleave',leave);
  }
  function close(force=false){selectionDrag=null;if(line)line.querySelectorAll('.is-selected').forEach(w=>w.classList.remove('is-selected'));requestId++;card.hidden=true;selected=null;lookupOrigin=null;hover=false;resume(force);}
  function source(){if(platform)return platform.source(video,cue,lastText,timelineMetadata);const id=new URL(location.href).searchParams.get('v')||'',seconds=Number(video?.currentTime)||0;return {videoId:id,title:document.title.replace(/ - YouTube$/,''),seconds,cueStart:cue?.start??seconds,sentence:lastText,url:`https://www.youtube.com/watch?v=${id}&t=${Math.floor(seconds)}s`,createdAt:new Date().toISOString()};}

  async function saveWord(data,origin,button){button.disabled=true;try{
    // A single writer in the background serializes concurrent additions.
    const result=await chrome.runtime.sendMessage({target:'notebook',type:'add',entry:{word:data.word,kind:data.kind||(/\s/.test(data.word)?'phrase':'word'),phonetic:data.phonetic,chinese:data.chinese,meanings:data.meanings,translationSource:{id:data.sourceId||'builtin',name:data.sourceName||'默认词典',provider:data.provider||'builtin'}},source:origin});
    if(result?.error)throw Error(result.error);button.textContent='已加入生词本 ✓';
  }catch{button.textContent='保存失败，点击重试';button.disabled=false;}}
  function openSourceSettings(sourceId){chrome.runtime.sendMessage({target:'translation-sources',type:'open',sourceId}).catch(()=>{});}
  async function lookup(word,originOverride){
    const id=++requestId;selected=word;const origin=originOverride||source();lookupOrigin=origin;card.hidden=false;card.replaceChildren();
    const heading=el('div','','lookup-heading'),title=el('h2',word),add=el('button','＋ 加入生词本');add.disabled=true;heading.append(title,add);card.append(heading);
    const adopted=el('div','请选择一个已加载的释义','muted');card.append(adopted);let chosen=null;
    const bodies=el('div','','source-results');card.append(bodies);
    function adopt(data,button){chosen=data;adopted.textContent='收藏释义来源：'+(data.sourceName||'默认词典');add.disabled=false;add.textContent='＋ 加入生词本';bodies.querySelectorAll('.adopt-meaning').forEach(b=>{b.textContent=b===button?'已采用':'采用此释义';b.setAttribute('aria-pressed',String(b===button));});}
    add.onclick=()=>{if(chosen)saveWord(chosen,origin,add);};
    const footer=el('div','','lookup-footer'),settings=el('button','翻译来源设置'),done=el('button','关闭并继续'),book=el('button','生词本 ↗');settings.onclick=()=>openSourceSettings();done.onclick=()=>close(true);book.onclick=()=>chrome.runtime.sendMessage({target:'notebook',type:'open'}).catch(()=>{book.textContent='打开失败，请重试';});footer.append(settings,done,book);
    card.append(el('p',origin.sentence,'context-sentence'),el('div',`${origin.title}${origin.platform==='bilibili'?' · P'+origin.part+(origin.partTitle?' '+origin.partTitle:''):''} · ${Math.floor(origin.seconds/60)}:${String(Math.floor(origin.seconds%60)).padStart(2,'0')}`,'muted'),footer);
    function showEmpty(){if(!bodies.querySelector('.translation-source')){bodies.replaceChildren(el('p','未开启翻译来源，请在设置中选择要展示的来源。','muted'));chosen=null;add.disabled=true;adopted.textContent='未选择释义';}}
    function createSource(meta){
      const section=el('section','','translation-source');section.dataset.sourceId=meta.id;
      const header=el('div','','source-header'),toggle=el('button',meta.name,'source-toggle'),chevron=el('span','⌄','source-chevron'),menu=el('button','⋮','source-menu-button'),menuItems=el('div','','source-menu');menuItems.hidden=true;menu.setAttribute('aria-label',meta.name+'的选项');menu.setAttribute('aria-expanded','false');
      toggle.append(chevron);toggle.setAttribute('aria-expanded','false');const body=el('div','','source-body');body.hidden=true;
      const configure=el('button','配置来源'),prefer=el('button','设为默认展开'),hide=el('button','隐藏此来源');configure.onclick=()=>openSourceSettings(meta.id);prefer.onclick=async()=>{await chrome.runtime.sendMessage({target:'dictionary-sources',type:'prefer',sourceId:meta.id});menuItems.hidden=true;menu.setAttribute('aria-expanded','false');};hide.onclick=async()=>{const response=await chrome.runtime.sendMessage({target:'dictionary-sources',type:'hide',sourceId:meta.id});if(response?.error)return;section.remove();if(chosen?.sourceId===meta.id){chosen=null;add.disabled=true;adopted.textContent='请选择其他释义';}showEmpty();};menuItems.append(prefer,configure,hide);menu.onclick=()=>{menuItems.hidden=!menuItems.hidden;menu.setAttribute('aria-expanded',String(!menuItems.hidden));};header.append(toggle,menu);section.append(header,menuItems,body);bodies.append(section);
      let pending=false,loaded=false;
      async function load(){
        if(pending||loaded)return;
        if(!meta.ready){body.replaceChildren(el('p','此来源尚未配置或启用。','muted'));const config=el('button','去配置');config.onclick=()=>openSourceSettings(meta.id);body.append(config);return;}
        pending=true;body.replaceChildren(el('p','正在查询…','muted'));
        try{
          const data=await chrome.runtime.sendMessage({target:'dictionary',sourceId:meta.id,word,context:origin.sentence});
          if(id!==requestId||!section.isConnected)return;
          if(data?.error)throw Error(data.error);if(!data)throw Error('未收到查询结果');loaded=true;body.replaceChildren();
          const result={...data,sourceId:meta.id,sourceName:meta.name,provider:meta.provider};
          body.append(el('div',result.phonetic||'','muted'),el('p',result.chinese||'暂无中文翻译','result-chinese'));
          for(const meaning of result.meanings||[])body.append(el('div',`${meaning.pos} · ${meaning.definition}`,'meaning'));
          body.append(el('p',result.sourceLabel||'词典释义，可能存在语境差异。','muted'));
          const choose=el('button','采用此释义','adopt-meaning');choose.setAttribute('aria-pressed','false');choose.onclick=()=>adopt(result,choose);body.append(choose);if(!chosen)adopt(result,choose);
        }catch(error){if(id!==requestId||!section.isConnected)return;body.replaceChildren(el('p',error.message,'lookup-error'));const retry=el('button','重试');retry.onclick=()=>load();body.append(retry);}
        finally{pending=false;}
      }
      toggle.onclick=()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));if(!body.hidden)load();};
      if(meta.expanded){body.hidden=false;toggle.setAttribute('aria-expanded','true');load();}
    }
    try{const result=await chrome.runtime.sendMessage({target:'dictionary-sources',type:'list'});if(id!==requestId)return;if(result?.error)throw Error(result.error);for(const meta of result?.sources||[])createSource(meta);showEmpty();}
    catch(error){if(id===requestId)bodies.replaceChildren(el('p',error.message||'无法读取翻译来源，请刷新页面重试。','lookup-error'));}
  }

  function render(text){line.replaceChildren();
    previousButton=el('button','','sentence-nav previous');nextButton=el('button','','sentence-nav next');
    for(const [button,direction] of [[previousButton,-1],[nextButton,1]]){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','20');svg.setAttribute('height','20');svg.setAttribute('aria-hidden','true');svg.style.display='block';const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',direction<0?'M14 6l-6 6 6 6':'M10 6l6 6-6 6');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);button.append(svg);}previousButton.setAttribute('aria-label','上一句开头');nextButton.setAttribute('aria-label','下一句开头');previousButton.onclick=e=>{e.stopPropagation();navigateSentence(-1);};nextButton.onclick=e=>{e.stopPropagation();navigateSentence(1);};line.append(previousButton,nextButton);updateNavigation();if(!text){line.append(el('span',(identity().platform==='bilibili'?(timeline.length?'当前时段无字幕':timelineError||'等待B站英文字幕…'):'等待英文字幕 · 请在 YouTube CC 中选择英语'),'hint'));return;}
    let offset=0,index=0;
    for(const part of text.split(/([A-Za-z]+(?:['’\-][A-Za-z]+)*)/g)){
      if(/^[A-Za-z]/.test(part)){const button=el('button',part,'word');button.dataset.index=index++;button.dataset.start=offset;button.dataset.end=offset+part.length;button.onclick=e=>{e.stopPropagation();if(suppressClick){suppressClick=false;return;}lookup(part);};line.append(button);}else line.append(document.createTextNode(part));
      offset+=part.length;
    }
  }

  async function loadTimeline(force=false){
    const id=identity().key;
    if(!id||!timelineTools||timelineLoading||(!force&&timelineTerminal)||(!force&&Date.now()-lastTimelineAttempt<15000))return;
    const token=++timelineRequest;timelineLoading=true;lastTimelineAttempt=Date.now();timelineError='正在获取字幕时间轴';if(identity().platform==='bilibili'&&line&&!selected&&!timeline.length)render('');
    try{const result=await chrome.runtime.sendMessage({target:'caption-timeline',trackId:selectedTrack});
      if(token!==timelineRequest||id!==identity().key)return;
      if(result?.identityKey&&result.identityKey!==id)return;if(identity().platform==='youtube'&&result?.videoId&&result.videoId!==identity().videoId)return;
      timelineTerminal=Boolean(result?.unavailable);timelineMetadata=result?.metadata||null;availableTracks=result?.tracks||[];selectedTrack=result?.selectedTrack||selectedTrack;
      const parsed=timelineTools.parse(result?.data);
      timeline=parsed;timelineVideoId=id;timelineError=parsed.length?'':(result?.error||'暂无可用字幕时间轴；关闭再开启学习模式可重试');if(line&&!selected&&!parsed.length&&identity().platform==='bilibili')render('');
    }catch{if(token===timelineRequest)timelineError='无法读取时间轴，关闭再开启学习模式可重试';}
    finally{if(token===timelineRequest)timelineLoading=false;}
  }
  function updateNavigation(){
    if(!previousButton||!video)return;
    for(const [button,direction] of [[previousButton,-1],[nextButton,1]]){
      const index=video.unsupported?-1:timelineTools?.target(timeline,video.currentTime,direction)??-1;
      button.disabled=index<0;button.title=timeline.length?(index<0?(direction<0?'已经是第一句':'已经是最后一句'):(direction<0?'跳到上一句字幕开头':'跳到下一句字幕开头')):timelineError;
    }
  }
  function navigateSentence(direction){
    const index=timelineTools?.target(timeline,video?.currentTime||0,direction)??-1;if(index<0||!video)return;
    // Seeking does not change the user's paused/playing state or trigger auto-resume.
    selectionDrag=null;requestId++;selected=null;if(card)card.hidden=true;
    const target=timeline[index];video.currentTime=target.start;cue=target;lastText=target.text;render(target.text);
  }
  // Keep CC enabled for its timing/text updates; suppress only its visual layer.
  const nativeCaptionStyle=el('style');
  nativeCaptionStyle.id='jujian-native-caption-style';
  nativeCaptionStyle.textContent='html[data-jujian-captions="hidden"] #movie_player .ytp-caption-window-container,html[data-jujian-captions="hidden"] .bpx-player-subtitle-wrap,html[data-jujian-captions="hidden"] .bilibili-player-video-subtitle { opacity: 0 !important; pointer-events: none !important; }';
  function showNativeCaptions(show){
    if(show){document.documentElement.removeAttribute('data-jujian-captions');nativeCaptionStyle.remove();}
    else{if(!nativeCaptionStyle.isConnected)document.documentElement.append(nativeCaptionStyle);document.documentElement.setAttribute('data-jujian-captions','hidden');}
  }
  function clampPosition(rect){
    if(!line||!rect.width||!rect.height)return;
    const width=Math.min(innerWidth-16,rect.width*.84),height=line.offsetHeight||60;
    const left=Math.max(Math.max(8,rect.left),Math.min(Math.min(innerWidth-width-8,rect.right-width),rect.left+subtitlePosition.x*rect.width));
    const top=Math.max(Math.max(42,rect.top),Math.min(Math.min(innerHeight-height-8,rect.bottom-height),rect.top+subtitlePosition.y*rect.height));
    subtitlePosition={x:(left-rect.left)/rect.width,y:(top-rect.top)/rect.height};
  }
  function tick(){
    if(enabled){
      const current=platform?platform.video():document.querySelector('#movie_player video')||document.querySelector('video');current?.refresh?.();
      if(enabled&&!identity().supported){enabled=false;timeline=[];showNativeCaptions(true);if(host)host.style.display='none';if(card)close();requestAnimationFrame(tick);return;}
      if(current!==video||lastUrl!==location.href){if(identity().key!==timelineVideoId){autoPaused=false;pausedVideo=null;}else resume();video=current;lastUrl=location.href;lastText='';cue=null;if(card)close();const id=identity().key;if(id!==timelineVideoId){timeline=[];timelineMetadata=null;availableTracks=[];selectedTrack='';timelineTerminal=false;lastMediaError='';timelineVideoId=id;timelineRequest++;timelineLoading=false;lastTimelineAttempt=0;}loadTimeline();}
      if(video){if(!host)mount();const full=document.fullscreenElement;const parent=full&&!['VIDEO','BWP-VIDEO'].includes(full.tagName)?full:document.documentElement;if(host.parentNode!==parent)parent.append(host);
        const r=video.getBoundingClientRect();host.style.display=r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&!['VIDEO','BWP-VIDEO'].includes(full?.tagName)?'block':'none';
        showNativeCaptions(host.style.display==='none'||(identity().platform==='bilibili'&&(!timeline.length||video.unsupported)));
        clampPosition(r);const subtitleLeft=r.left+r.width*subtitlePosition.x,subtitleTop=r.top+r.height*subtitlePosition.y;
        line.style.left=`${subtitleLeft}px`;line.style.width=`${Math.min(innerWidth-16,r.width*.84)}px`;line.style.top=`${subtitleTop}px`;
        controls.hidden=!positionEditing;controls.style.left=`${Math.max(8,Math.min(innerWidth-controls.offsetWidth-8,subtitleLeft))}px`;controls.style.top=`${Math.max(8,subtitleTop-38)}px`;
        card.style.left=`${Math.max(8,Math.min(innerWidth-352,subtitleLeft+line.offsetWidth/2-170))}px`;
        const above=subtitleTop-16,below=innerHeight-subtitleTop-line.offsetHeight-16;
        const placeAbove=above>=below;const popupHeight=Math.max(90,Math.min(innerHeight*.55,placeAbove?above:below));card.style.maxHeight=`${popupHeight}px`;card.style.height=card.querySelectorAll('.translation-source').length>1?`${popupHeight}px`:'auto';
        if(placeAbove){card.style.top='auto';card.style.bottom=`${innerHeight-subtitleTop+8}px`;}else{card.style.bottom='auto';card.style.top=`${subtitleTop+line.offsetHeight+8}px`;}
        const native=document.querySelector('#movie_player .ytp-caption-window-container');
        const index=timelineTools?.indexAt(timeline,video.currentTime)??-1;
        const active=index>=0&&video.currentTime<timeline[index].end?timeline[index]:null;
        const text=video.unsupported?'':timeline.length?(active?.text||''):(identity().platform==='bilibili'?'':(native?.innerText||'').trim().replace(/\s+/g,' '));
        if(!timeline.length&&!timelineLoading)loadTimeline();
        if(video.unsupported&&video.unsupported!==lastMediaError){lastMediaError=video.unsupported;timelineError=video.unsupported;render('');}
        updateNavigation();
        if(active&&!selected&&!selectionDrag)cue=active;
        if(text!==lastText&&!selected&&!selectionDrag){lastText=text;cue=active||{start:video.currentTime};render(text);}
        if(!line.childNodes.length)render(text);
      }else{showNativeCaptions(true);if(host)host.style.display='none';}
    }requestAnimationFrame(tick);
  }
  chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.type==='learning-state'){reply({learning:enabled,positionEditing,platform:identity().platform,tracks:availableTracks,selectedTrack,timelineError});return;}
    if(m.type==='learning-position-reset'){subtitlePosition={x:.08,y:.69};positionEditing=false;if(controls)controls.hidden=true;chrome.storage.local.set({[positionKey]:{...subtitlePosition}}).then(()=>reply({learning:enabled,positionEditing})).catch(()=>reply({error:'位置保存失败，请重试'}));return true;}
    if(m.type==='learning-track-refresh'){timeline=[];timelineRequest++;timelineLoading=false;lastTimelineAttempt=0;if(card&&!card.hidden)close();loadTimeline(true);reply({learning:enabled,platform:identity().platform,note:'正在重新读取字幕…'});return;}
    if(m.type==='learning-track-select'){selectedTrack=String(m.trackId||'');if(card&&!card.hidden)close();lastText='';cue=null;timeline=[];timelineRequest++;timelineLoading=false;lastTimelineAttempt=0;loadTimeline(true);reply({learning:enabled,positionEditing,platform:identity().platform,tracks:availableTracks,selectedTrack,note:'正在切换英文字幕…'});return;}
    if(m.type==='learning-position-edit'){
      if(!identity().supported){reply({error:'仅支持 YouTube 和B站普通视频页'});return;}
      if(!(platform?platform.video():document.querySelector('#movie_player video,video'))){reply({error:'请先打开视频'});return;}
      positionEditing=!positionEditing;enabled=true;reply({learning:enabled,positionEditing,note:positionEditing?'回到视频拖动调整，松开后自动锁定；Esc 退出。':''});return;
    }if(m.type!=='learning-toggle')return;
    if(!identity().supported){reply({learning:false,note:'仅支持 YouTube 和B站普通视频页。'});return;}
    enabled=!enabled;if(enabled){lastTimelineAttempt=0;timelineTerminal=false;if(video&&identity().key===timelineVideoId)loadTimeline(true);}if(!enabled){positionEditing=false;showNativeCaptions(true);if(host)host.style.display='none';if(card)close(true);resume(true);}reply({learning:enabled,platform:identity().platform,note:enabled?(identity().platform==='bilibili'?'已开启B站学习，正在读取当前分 P 的独立英文字幕。':'已开启。请在视频 CC 中选择英文字幕；单击查词，拖动选择词组翻译。'):''});
  });
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(positionEditing){positionEditing=false;moveDrag=null;if(controls)controls.hidden=true;}else if(card&&!card.hidden)close();}});
  requestAnimationFrame(tick);
})();
