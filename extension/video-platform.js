(() => {
  if(globalThis.JujianVideoPlatform)return;
  const proxies=new WeakMap();
  function identity(url=location.href){const u=new URL(url);if(/(^|\.)bilibili\.com$/.test(u.hostname)){
    const id=u.pathname.match(/^\/video\/(BV[a-zA-Z0-9]{10}|av\d+)\/?$/i)?.[1]||'';const part=Math.max(1,Math.floor(Number(u.searchParams.get('p'))||1));return {platform:'bilibili',videoId:id,part,key:id?`bilibili:${id}:p${part}`:'',supported:Boolean(id)};
  }const id=u.searchParams.get('v')||'';return {platform:'youtube',videoId:id,part:1,key:id,supported:/(^|\.)youtube\.com$/.test(u.hostname)&&Boolean(id)};}
  function findMedia(){const selector=identity().platform==='bilibili'?'#bilibili-player video,.bpx-player-video-wrap video,.bpx-player-video-wrap bwp-video,#bilibili-player bwp-video':'#movie_player video';return document.querySelector(selector)||document.querySelector('video');}
  function video(){const node=findMedia();if(!node)return null;if(typeof node.currentTime==='number'&&typeof node.play==='function')return node;
    if(proxies.has(node))return proxies.get(node);
    let snapshot={time:0,paused:true},lastPoll=0,polling=false,unsupported='',controlRevision=0;
    const send=(action,time)=>chrome.runtime.sendMessage({target:'bilibili-control',action,time});
    const proxy={get unsupported(){return unsupported;},get isConnected(){return node.isConnected;},get currentTime(){return snapshot.time;},set currentTime(time){controlRevision++;snapshot.time=time;send('seek',time).catch(()=>{});},get paused(){return snapshot.paused;},pause(){controlRevision++;snapshot.paused=true;send('pause').catch(()=>{});},play(){controlRevision++;snapshot.paused=false;return send('play').then(r=>{if(r?.error)throw Error(r.error);});},getBoundingClientRect:()=>node.getBoundingClientRect(),refresh(){if(polling||Date.now()-lastPoll<(unsupported?5000:400))return;polling=true;lastPoll=Date.now();const key=identity().key,revision=controlRevision;send('state').then(r=>{if(key!==identity().key||revision!==controlRevision)return;if(r?.error){unsupported=r.error;return;}if(Number.isFinite(r?.time)&&typeof r.paused==='boolean'){unsupported='';snapshot={time:r.time,paused:r.paused};}}).catch(()=>{}).finally(()=>polling=false);}};
    proxies.set(node,proxy);return proxy;
  }
  function source(media,cue,sentence,metadata){const info=identity(),seconds=Math.max(0,Number(media?.currentTime)||0),same=metadata?.identityKey===info.key;
    if(info.platform==='bilibili')return {platform:'bilibili',videoId:same?metadata.bvid:info.videoId,bvid:same?metadata.bvid:info.videoId,cid:same?String(metadata.cid||''):'',part:info.part,partTitle:same?metadata.partTitle||'':'',title:(same?metadata.title:'')||document.querySelector('h1.video-title')?.textContent?.trim()||document.title.replace(/_哔哩哔哩.*$/,''),seconds,cueStart:cue?.start??seconds,sentence,url:`https://www.bilibili.com/video/${encodeURIComponent(same?metadata.bvid:info.videoId)}/?p=${info.part}&t=${Math.floor(seconds)}`,createdAt:new Date().toISOString()};
    return {platform:'youtube',videoId:info.videoId,title:document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim()||document.title.replace(/ - YouTube$/,''),seconds,cueStart:cue?.start??seconds,sentence,url:`https://www.youtube.com/watch?v=${encodeURIComponent(info.videoId)}&t=${Math.floor(seconds)}s`,createdAt:new Date().toISOString()};
  }
  globalThis.JujianVideoPlatform={identity,video,source};
})();
