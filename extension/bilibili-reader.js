(() => {
  if(globalThis.__jujianBilibiliReader)return;
  const getIdentity=()=>{const u=new URL(location.href),videoId=u.pathname.match(/^\/video\/(BV[a-zA-Z0-9]{10}|av\d+)\/?$/i)?.[1]||'',part=Math.max(1,Math.floor(Number(u.searchParams.get('p'))||1));return {videoId,part,key:`bilibili:${videoId}:p${part}`};};
  async function read(preferredTrack=''){
    const initial=getIdentity(),identityKey=initial.key,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let metadata;
    const responseBase=()=>({platform:'bilibili',videoId:initial.videoId,identityKey,metadata});
    async function json(url,credentials='include'){const r=await fetch(url,{credentials,signal:controller.signal});if(!r.ok)throw Error(`B站接口 HTTP ${r.status}，请稍后重试`);return r.json();}
    try{
      if(!initial.videoId)throw Error('仅支持B站普通视频页');
      let view=globalThis.__INITIAL_STATE__?.videoData;
      const matches=v=>initial.videoId.toLowerCase().startsWith('av')?String(v?.aid)===initial.videoId.slice(2):v?.bvid===initial.videoId;
      if(!matches(view)||!Array.isArray(view.pages)){const query=initial.videoId.toLowerCase().startsWith('av')?'aid='+initial.videoId.slice(2):'bvid='+encodeURIComponent(initial.videoId);const response=await json('https://api.bilibili.com/x/web-interface/view?'+query);if(response.code!==0||!matches(response.data))throw Error('未能获取当前视频信息，请检查登录或稍后重试');view=response.data;}
      const page=view.pages.find(p=>Number(p.page)===initial.part);if(!page?.cid||!/^BV[a-zA-Z0-9]{10}$/.test(view.bvid||''))throw Error('未找到当前分 P 的视频标识');
      metadata={identityKey,bvid:view.bvid,cid:String(page.cid),part:initial.part,title:view.title||'',partTitle:page.part||''};
      // Standard WBI signing with the currently published image keys; no login bypass.
      const nav=await json('https://api.bilibili.com/x/web-interface/nav'),keys=nav.data?.wbi_img;
      if(!keys?.img_url||!keys?.sub_url||typeof globalThis.__jujianMD5!=='function')throw Error('字幕签名信息不可用，请刷新页面重试');
      const seed=[keys.img_url,keys.sub_url].map(s=>String(s).split('/').pop().split('.')[0]).join('');
      const table=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
      if(seed.length<64)throw Error('B站签名信息格式不兼容');const mixin=table.map(i=>seed[i]).join('').slice(0,32);
      const params={bvid:view.bvid,cid:String(page.cid),wts:String(Math.floor(Date.now()/1000))};const query=Object.keys(params).sort().map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k].replace(/[!'()*]/g,''))).join('&');
      const player=await json('https://api.bilibili.com/x/player/wbi/v2?'+query+'&w_rid='+globalThis.__jujianMD5(query+mixin));
      if(player.code!==0)throw Error(player.code===-101?'字幕需要登录B站后读取':'B站暂未允许读取字幕，请稍后重试');
      const data=player.data;if(!data||String(data.cid)!==String(page.cid)||(data.aid&&String(data.aid)!==String(view.aid)))throw Error('字幕身份与当前分 P 不一致，已拒绝使用');
      const all=data.subtitle?.subtitles||[],english=all.filter(t=>/^(?:ai-)?en(?:-|$)/i.test(t.lan||'')||/^(?:英语|英文|English)/i.test(t.lan_doc||''));
      const tracks=english.map(t=>({id:String(t.id_str||t.id||t.lan),name:t.lan_doc||t.lan,language:t.lan}));
      if(!english.length){const login=data.need_login_subtitle||data.subtitle?.need_login_subtitle;return {...responseBase(),tracks:[],unavailable:login?'login':'no-english',error:login?'请先登录B站再读取字幕；手动遮挡仍可用。':all.length?'当前分 P 只有其他语言字幕，没有独立英文 CC。可使用手动遮挡。':'当前分 P 没有可读取的独立英文字幕。可使用手动遮挡。'};}
      const selectedElement=document.querySelector('.bpx-player-ctrl-subtitle-language-item.bpx-state-active,.bpx-player-ctrl-subtitle-menu-item.bpx-state-active');const selectedLan=selectedElement?.getAttribute('data-lan');
      const track=english.find(t=>String(t.id_str||t.id||t.lan)===preferredTrack)||english.find(t=>t.lan===selectedLan)||english[0];
      const url=new URL(track.subtitle_url,location.origin);if(url.protocol==='http:')url.protocol='https:';
      if(url.protocol!=='https:'||!/(^|\.)(?:hdslb\.com|bilibili\.com)$/.test(url.hostname))throw Error('字幕来源地址不受支持');
      const body=await json(url.href,'omit');if(!Array.isArray(body.body))throw Error('字幕正文格式暂不受支持');
      if(getIdentity().key!==identityKey)throw Error('视频已切换，请重新读取字幕');
      return {...responseBase(),tracks,selectedTrack:String(track.id_str||track.id||track.lan),data:body};
    }catch(error){return {...responseBase(),error:error.name==='AbortError'?'B站字幕读取超时，请稍后重试。':error.message};}finally{clearTimeout(timer);}
  }
  async function control(action,time){const node=document.querySelector('.bpx-player-video-wrap video,.bpx-player-video-wrap bwp-video,#bilibili-player video,#bilibili-player bwp-video');if(!node||typeof node.currentTime!=='number')return {error:'此播放器渲染模式暂不支持播放控制，请切换普通播放模式'};
    if(action==='seek'){if(!Number.isFinite(time)||time<0)return {error:'无效时间'};node.currentTime=time;}
    else if(action==='pause')node.pause();else if(action==='play')await node.play();else if(action!=='state')return {error:'不支持此操作'};
    return {time:node.currentTime,paused:node.paused};}
  globalThis.__jujianBilibiliReader={read,control};
})();
