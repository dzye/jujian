if(typeof importScripts==='function')importScripts('vocabulary-backup.js','translation-api.js');
async function send(tabId, message) {
  try {
    await chrome.scripting.executeScript({target: {tabId}, files: ['video-platform.js', 'subtitle-mask.js', 'caption-timeline.js', 'subtitle-learning.js']});
    return await chrome.tabs.sendMessage(tabId, message, {frameId: 0});
  } catch { return {error: '此页面无法使用扩展。请打开普通视频网站后重试。'}; }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.target !== 'background') return;
  chrome.tabs.query({active: true, currentWindow: true}).then(async ([tab]) => {
    reply(tab?.id ? await send(tab.id, message.payload) : {error: '没有找到当前标签页'});
  });
  return true;
});
chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (tab?.id) await send(tab.id, {type: command === 'toggle-edit' ? 'edit' : 'toggle'});
});

const wordJobs = new Map();
async function lookup(word) {
  const isPhrase=/\s/.test(word);
  const cacheKey = 'dict:' + word;
  const cache = (await chrome.storage.local.get(cacheKey))[cacheKey];
  if (cache) return cache;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const [dictionary, translation] = await Promise.allSettled([
      isPhrase ? Promise.resolve(null) : fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), {signal:controller.signal}).then(r => {if(!r.ok) throw Error('not found');return r.json();}),
      fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=en|zh-CN', {signal:controller.signal}).then(r=>r.json())
    ]);
    const entry = dictionary.status === 'fulfilled' && Array.isArray(dictionary.value) ? dictionary.value[0] : null;
    const t = translation.status === 'fulfilled' && translation.value.responseStatus === 200 ? translation.value.responseData?.translatedText : '';
    if (!entry && !t) throw Error('暂时查不到释义，请稍后重试。');
    const result = {word, kind:isPhrase?'phrase':'word', phonetic:entry?.phonetic || '', chinese:t || '', meanings:(entry?.meanings || []).slice(0,3).map(m=>({pos:m.partOfSpeech,definition:m.definitions?.[0]?.definition || ''}))};
    await chrome.storage.local.set({[cacheKey]:result});return result;
  } finally {clearTimeout(timeout);}
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target !== 'dictionary') return;
  const word = String(m.word || '').toLowerCase().trim().replace(/\s+/g,' ');
  if(!/^[a-z]+(?:['’-][a-z]+)*(?:[ ,.!?:;]+[a-z]+(?:['’-][a-z]+)*)*$/i.test(word) || word.length>200){reply({error:'请选择英文单词或词组（最多 200 个字符）'});return;}
  queryTranslationSource(m.sourceId||'builtin',word,String(m.context||'').slice(0,2000)).then(reply).catch(e=>reply({error:e.name==='AbortError'?'查询超时，请重试':e.message}));return true;
});
let translationSourceQueue=Promise.resolve();
async function loadTranslationSources(){
  const {translationSources:saved}=await chrome.storage.local.get('translationSources');
  if(Array.isArray(saved)&&saved.some(s=>s.id==='builtin'))return saved;
  const sources=[{id:'builtin',name:'默认词典',provider:'builtin',visible:true,expanded:true}];
  const {translationSettings:legacy}=await chrome.storage.local.get('translationSettings');
  if(legacy?.endpoint)sources.push({id:'custom-legacy',name:legacy.provider==='dictionary'?'在线词典 API':'AI 翻译',provider:legacy.provider||'ai',visible:Boolean(legacy.enabled),expanded:false,config:legacy});
  return sources;
}
function sourceMetadata(source){return {id:source.id,name:source.name,provider:source.provider,visible:source.visible!==false,expanded:source.expanded===true,ready:source.id==='builtin'||Boolean(source.config?.enabled&&source.config?.endpoint)};}
async function queryTranslationSource(sourceId,word,rawContext){
  const sources=await loadTranslationSources(),source=sources.find(s=>s.id===sourceId);
  if(!source||source.visible===false)throw Error('此翻译来源已隐藏或不存在，请到设置中开启');
  const meta={sourceId:source.id,sourceName:source.name,provider:source.provider};
  if(source.id==='builtin'){
    if(!wordJobs.has(word))wordJobs.set(word,lookup(word).finally(()=>wordJobs.delete(word)));
    return {...await wordJobs.get(word),...meta,sourceLabel:'默认词典 · 在线查询与本地缓存'};
  }
  if(!source.config?.enabled)throw Error('此来源尚未配置或启用，请先设置接口');
  const settings=source.config,context=settings.withContext?rawContext:'';
  const jobKey=JSON.stringify(['custom',source.id,settings.revision,word,context]),cacheKey='translation:'+jobKey;
  let result=(await chrome.storage.local.get(cacheKey))[cacheKey];
  if(!result){
    if(!wordJobs.has(jobKey))wordJobs.set(jobKey,JujianTranslationAPI.query(settings,word,context).then(async value=>{await chrome.storage.local.set({[cacheKey]:value});return value;}).finally(()=>wordJobs.delete(jobKey)));
    result=await wordJobs.get(jobKey);
  }
  return {...result,...meta};
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target!=='dictionary-sources'&&m.target!=='translation-sources')return;
  if(m.type==='open'){
    const suffix=m.sourceId?'#source/'+encodeURIComponent(m.sourceId):'';
    chrome.tabs.create({url:chrome.runtime.getURL('translation-settings.html')+suffix}).then(()=>reply({ok:true})).catch(()=>reply({error:'无法打开翻译来源设置'}));return true;
  }
  if(m.target==='dictionary-sources'&&(!m.type||m.type==='list')){loadTranslationSources().then(sources=>reply({sources:sources.filter(s=>s.visible!==false).map(sourceMetadata)})).catch(()=>reply({error:'无法读取翻译来源'}));return true;}
  const ownPage=String(sender.url||'').startsWith(chrome.runtime.getURL(''));
  const presentationAction=m.target==='dictionary-sources'&&['prefer','hide'].includes(m.type);
  if(!ownPage&&!presentationAction){reply({error:'请从翻译设置页面管理服务'});return;}
  translationSourceQueue=translationSourceQueue.catch(()=>{}).then(async()=>{
    let sources=await loadTranslationSources();
    if(m.type==='get')return {sources:sources.map(source=>{const {apiKey,...config}=source.config||{};return {...sourceMetadata(source),config,keyPresent:Boolean(apiKey)};})};
    if(m.type==='add'){
      if(sources.length>=12)throw Error('最多添加 12 个翻译来源');
      const provider=m.provider==='dictionary'?'dictionary':'ai',baseName=provider==='ai'?'AI 翻译':'在线词典 API';let name=baseName,number=2;while(sources.some(s=>s.name===name))name=baseName+' '+number++;const source={id:crypto.randomUUID(),name,provider,visible:true,expanded:false};sources.push(source);await chrome.storage.local.set({translationSources:sources});return {ok:true,id:source.id};
    }
    if(m.type==='layout'){
      if(!Array.isArray(m.sources)||m.sources.length!==sources.length||new Set(m.sources.map(s=>s.id)).size!==sources.length||m.sources.filter(s=>s.expanded).length>1)throw Error('来源展示配置无效');
      const reordered=m.sources.map(item=>{const old=sources.find(s=>s.id===item.id);if(!old)throw Error('来源不存在');return {...old,visible:item.visible!==false,expanded:item.expanded===true};});sources=reordered;
    }else if(m.type==='prefer'||m.type==='hide'){
      if(!sources.some(s=>s.id===m.sourceId))throw Error('来源不存在');
      sources=sources.map(source=>m.type==='prefer'?{...source,expanded:source.id===m.sourceId}:source.id===m.sourceId?{...source,visible:false}:source);
    }else if(m.type==='remove'){
      if(m.sourceId==='builtin')throw Error('默认词典需要保留，可以隐藏但不能删除');sources=sources.filter(s=>s.id!==m.sourceId);
    }else if(m.type==='save'){
      const source=sources.find(s=>s.id===m.sourceId);if(!source||source.id==='builtin')throw Error('无法配置此来源');const old=source.config||{};
      let key=m.settings?.clearKey?'':(m.settings?.apiKey||'');
      if(!key&&!m.settings?.clearKey&&old.apiKey){if(m.settings.endpoint!==old.endpoint||m.settings.provider!==old.provider)throw Error('更换地址或类型时，请重新填写密钥或清除旧密钥');key=old.apiKey;}
      const config=JujianTranslationAPI.normalize({...m.settings,apiKey:key});
      if(config.enabled&&!await chrome.permissions.contains({origins:[JujianTranslationAPI.origin(config.endpoint)]}))throw Error('请先授权 API 域名');
      config.revision=crypto.randomUUID();source.config=config;source.provider=config.provider;source.name=String(m.name||source.name).trim().slice(0,60)||'自定义翻译';
    }else if(m.type==='test'){
      const source=sources.find(s=>s.id===m.sourceId);if(!source?.config?.enabled)throw Error('请先启用并保存此来源接口');return {ok:true,result:await JujianTranslationAPI.query(source.config,'hello',source.config.withContext?'Hello, nice to meet you.':'')};
    }else throw Error('不支持此来源操作');
    await chrome.storage.local.set({translationSources:sources});return {ok:true};
  }).then(reply).catch(e=>reply({error:e.name==='AbortError'?'请求超时，请重试':e.message}));return true;
});

let notebookQueue=Promise.resolve();
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target!=='notebook'||m.type!=='add')return;
  notebookQueue=notebookQueue.catch(()=>{}).then(async()=>{
    const {words=[]}=await chrome.storage.local.get('words');const word=String(m.entry.word).toLowerCase();
    let entry=words.find(e=>e.word===word);if(!entry){entry={...m.entry,word,id:crypto.randomUUID(),status:'new',note:'',sources:[],createdAt:new Date().toISOString()};words.unshift(entry);}
    if(m.entry.translationSource){
      const incoming=m.entry.translationSource;
      entry.translations=entry.translations||[];
      if(entry.translationSource&&!entry.translations.some(t=>t.source?.id===entry.translationSource.id))entry.translations.push({source:entry.translationSource,chinese:entry.chinese,phonetic:entry.phonetic,meanings:entry.meanings||[]});
      const meaning={source:incoming,chinese:m.entry.chinese||'',phonetic:m.entry.phonetic||'',meanings:m.entry.meanings||[]};
      const existingIndex=entry.translations.findIndex(t=>t.source?.id===incoming.id);if(existingIndex<0)entry.translations.push(meaning);else entry.translations[existingIndex]=meaning;
      Object.assign(entry,{chinese:meaning.chinese,phonetic:meaning.phonetic,meanings:meaning.meanings,translationSource:incoming});
    }
    const source=m.source;if(!entry.sources.some(s=>(s.platform||'youtube')===(source.platform||'youtube')&&s.videoId===source.videoId&&(s.part||1)===(source.part||1)&&String(s.cid||'')===String(source.cid||'')&&Math.floor(s.seconds)===Math.floor(source.seconds)&&s.sentence===source.sentence))entry.sources.push(source);
    await chrome.storage.local.set({words});reply({ok:true});
  }).catch(()=>reply({error:'保存失败'}));return true;
});

// Read the currently selected caption track in the page's own world.
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target!=='caption-timeline')return;
  if(!sender.tab?.id){reply({error:'未找到视频标签页'});return;}
  if(/^https:\/\/(?:www\.)?bilibili\.com\/video\//.test(sender.url||sender.tab.url||'')){
    (async()=>{await chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[0]},world:'MAIN',files:['vendor/js-md5/md5-isolated.js','bilibili-reader.js']});const result=await chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[0]},world:'MAIN',func:async trackId=>globalThis.__jujianBilibiliReader.read(trackId),args:[String(m.trackId||'')]});return result[0]?.result||{error:'未能读取B站字幕'};})().then(reply).catch(()=>reply({error:'B站字幕暂时不可用，请刷新或检查登录状态'}));return true;
  }
  chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[0]},world:'MAIN',func:async()=>{
    const player=document.getElementById('movie_player');
    const response=player?.getPlayerResponse?.();
    const videoId=new URL(location.href).searchParams.get('v');
    const selected=player?.getOption?.('captions','track');
    const tracks=response?.captions?.playerCaptionsTracklistRenderer?.captionTracks||player?.getOption?.('captions','tracklist')||[];
    const track=(selected?.baseUrl?selected:null)||tracks.find(t=>selected?.vssId&&t.vssId===selected.vssId)||tracks.find(t=>selected?.languageCode&&t.languageCode===selected.languageCode)||tracks.find(t=>/^en(?:-|$)/.test(t.languageCode||''));
    if(!track?.baseUrl)return {videoId,error:'无法读取字幕时间轴。请开启英文 CC 后重试。'};
    const url=new URL(track.baseUrl,location.origin);
    if(url.protocol!=='https:'||!/(^|\.)youtube\.com$/.test(url.hostname))return {videoId,error:'不支持此字幕来源'};
    url.searchParams.set('fmt','json3');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{const res=await fetch(url.href,{credentials:'include',signal:controller.signal});if(!res.ok)throw Error('字幕请求失败');const data=await res.json();return {videoId,trackId:track.vssId||track.languageCode,data};}
    catch{return {videoId,error:'字幕时间轴暂时不可用；可继续查词，稍后重试。'};}
    finally{clearTimeout(timer);}
  }}).then(results=>reply(results[0]?.result||{error:'无法读取字幕时间轴'})).catch(()=>reply({error:'无法读取字幕时间轴，请刷新后重试'}));return true;
});

chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target!=='notebook')return;
  if(m.type==='open'){
    chrome.tabs.create({url:chrome.runtime.getURL('vocabulary.html')}).then(()=>reply({ok:true})).catch(()=>reply({error:'生词本打开失败，请在扩展管理页面重新加载句间'}));return true;
  }
  if(m.type!=='import')return;
  // Import is an extension-page operation; ordinary webpage scripts cannot request it.
  if(sender.tab && !String(sender.url||'').startsWith(chrome.runtime.getURL(''))){reply({error:'请从生词本页面导入'});return;}
  notebookQueue=notebookQueue.catch(()=>{}).then(async()=>{
    const incoming=JujianVocabularyBackup.validate(m.backup);
    const {words=[]}=await chrome.storage.local.get('words');
    const result=JujianVocabularyBackup.merge(words,incoming);
    await chrome.storage.local.set({words:result.words});reply({ok:true,added:result.added,merged:result.merged,total:result.words.length});
  }).catch(e=>reply({error:e.message||'导入失败，原有数据未修改'}));return true;
});

chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target!=='translation-settings')return;
  const ownPage=String(sender.url||'').startsWith(chrome.runtime.getURL(''));
  if(!ownPage){reply({error:'仅允许在扩展设置页操作'});return;}
  (async()=>{
    const {translationSettings:old={}}=await chrome.storage.local.get('translationSettings');
    if(m.type==='get'){const {apiKey,...publicSettings}=old;return {settings:publicSettings,keyPresent:Boolean(apiKey)};}
    if(m.type==='save'){
      let key=m.settings?.clearKey?'':(m.settings?.apiKey||'');
      if(!key&&!m.settings?.clearKey&&old.apiKey){
        if(m.settings.endpoint!==old.endpoint||m.settings.provider!==old.provider)throw Error('更换服务地址或类型时，请重新填写密钥，或选择清除旧密钥');
        key=old.apiKey;
      }
      const config=JujianTranslationAPI.normalize({...m.settings,apiKey:key});
      if(config.enabled&&!await chrome.permissions.contains({origins:[JujianTranslationAPI.origin(config.endpoint)]}))throw Error('尚未授权访问此 API 域名');
      config.revision=crypto.randomUUID();await chrome.storage.local.set({translationSettings:config});return {ok:true,keyPresent:Boolean(config.apiKey)};
    }
    if(m.type==='test'){
      if(!old.enabled)throw Error('请先启用并保存配置，再测试');
      const result=await JujianTranslationAPI.query(old,'hello',old.withContext?'Hello, nice to meet you.':'');return {ok:true,result};
    }
    throw Error('不支持的设置操作');
  })().then(reply).catch(e=>reply({error:e.name==='AbortError'?'请求超时，请检查地址或稍后重试':e.message}));return true;
});

chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m.target!=='bilibili-control')return;
  if(!sender.tab?.id||!/^https:\/\/(?:www\.)?bilibili\.com\/video\//.test(sender.url||'')){reply({error:'仅限B站普通视频页'});return;}
  (async()=>{await chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[0]},world:'MAIN',files:['bilibili-reader.js']});const result=await chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[0]},world:'MAIN',func:async(action,time)=>globalThis.__jujianBilibiliReader.control(action,time),args:[m.action,Number(m.time)]});return result[0]?.result||{error:'无法控制播放器'};})().then(reply).catch(()=>reply({error:'播放器控制失败'}));return true;
});
