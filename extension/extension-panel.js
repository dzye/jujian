const $ = id => document.getElementById(id);
let trackOptionsKey='',statusPollTimer;const trackSelect=new TomSelect('#subtitle-track',{create:false,maxItems:1,controlInput:null,closeAfterSelect:true,onChange:trackId=>{if(trackId)send({type:'learning-track-select',trackId});}});
function updateTracks(result){if(!Array.isArray(result.tracks))return;const tracks=result.tracks;$('track-picker').hidden=!tracks.length;const key=JSON.stringify(tracks);if(key!==trackOptionsKey){trackOptionsKey=key;trackSelect.clear(true);trackSelect.clearOptions();trackSelect.addOptions(tracks.map(t=>({value:t.id,text:t.name})));}if(result.selectedTrack)trackSelect.setValue(result.selectedTrack,true);}

async function send(payload) {
  try {
    const result = await chrome.runtime.sendMessage({target: 'background', payload});
    if (result?.error) { $('error').textContent = result.error; return; }
    $('error').textContent = '';
    if (result?.learning !== undefined) { $('learn').textContent = result.learning ? '关闭英文字幕学习' : '开启英文字幕学习'; $('learning-note').textContent = result.note || (result.learning&&result.platform==='bilibili'?result.timelineError||'':''); if(result.platform)$('learning-platform-hint').textContent=result.platform==='bilibili'?'B站：读取当前分 P 的独立英文 CC；无英文轨道时可用手动遮挡。':'YouTube：先在 CC 中选择英文字幕。'; updateTracks(result);clearTimeout(statusPollTimer);if(result.learning&&result.platform==='bilibili'&&/正在/.test(result.note||result.timelineError||''))statusPollTimer=setTimeout(()=>send({type:'learning-state'}),1200); $('learning-status').textContent=result.learning?'字幕学习已开启':'字幕学习未开启'; if(result.positionEditing!==undefined)$('subtitle-position').textContent=result.positionEditing?'退出位置调整':'调整字幕位置'; } else if (result) render(result);
  } catch { $('error').textContent = '连接失败，请刷新视频页面后重试。'; }
}
function render(s) {
  $('toggle').textContent = s.enabled ? '关闭遮挡' : '开启遮挡';
  $('edit').textContent = s.editing ? '锁定，开始观看' : '调整位置与大小';
  $('status').textContent = s.enabled ? (s.editing ? '编辑中 · 拖动遮挡条调整' : '已锁定 · 不影响视频操作') : '遮挡已关闭';
  $('opacity').value = Math.round(s.opacity * 100);
  $('value').textContent = `${Math.round(s.opacity * 100)}%`;
  $('color').value = s.color;
}
$('toggle').onclick = () => send({type: 'toggle'});
$('edit').onclick = () => send({type: 'edit'});
$('reset').onclick = () => send({type: 'reset'});
$('opacity').oninput = e => { $('value').textContent = `${e.target.value}%`; send({type:'update', opacity:Number(e.target.value)/100}); };
$('color').oninput = e => send({type:'update', color:e.target.value});


$('learn').onclick=()=>send({type:'learning-toggle'});
$('notebook').onclick=async()=>{try{const result=await chrome.runtime.sendMessage({target:'notebook',type:'open'});if(result?.error)$('error').textContent=result.error;}catch{$('error').textContent='生词本打开失败，请重新加载扩展。';}};



chrome.storage.local.get('learningPreferences').then(({learningPreferences:p={}})=>{
  $('hoverPause').checked=p.hoverPause!==false;
  $('autoResume').checked=p.autoResume!==false;
});
for(const id of ['hoverPause','autoResume']) $(id).onchange=()=>chrome.storage.local.set({learningPreferences:{hoverPause:$('hoverPause').checked,autoResume:$('autoResume').checked}});

$('subtitle-position').onclick=()=>send({type:'learning-position-edit'});
$('subtitle-reset').onclick=()=>send({type:'learning-position-reset'});

function selectTab(name,focus=false){
  for(const key of ['learning','mask']){const active=key===name,tab=$('tab-'+key);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$('panel-'+key).hidden=!active;if(active&&focus)tab.focus();}
  $('error').textContent='';
  send({type:name==='learning'?'learning-state':'state'});
}
for(const [index,name] of ['learning','mask'].entries()){
  $('tab-'+name).onclick=()=>selectTab(name);
  $('tab-'+name).onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'learning':e.key==='End'?'mask':index===0?'mask':'learning';selectTab(next,true);}};
}
selectTab('learning');

$('translation-config').onclick=()=>chrome.runtime.openOptionsPage();
chrome.runtime.sendMessage({target:'dictionary-sources',type:'list'}).then(({sources=[]})=>{$('translation-summary').textContent=sources.length?'显示 '+sources.length+' 个翻译来源':'未开启翻译来源';}).catch(()=>{});

$('subtitle-refresh').onclick=()=>send({type:'learning-track-refresh'});
