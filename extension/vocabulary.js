const $=id=>document.getElementById(id);let words=[],visibleLimit=50,videoOptionsKey='',detailSequence=null;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
// All select interaction, keyboard navigation and dropdown positioning are Tom Select.
function createSelect(id,searchable=false){return new TomSelect('#'+id,{create:false,maxItems:1,closeAfterSelect:true,allowEmptyOption:true,...(searchable?{}:{controlInput:null}),searchField:['text'],maxOptions:10000,onChange:()=>{visibleLimit=50;render();},render:{no_results:()=>'<div class="no-results">没有匹配的视频</div>'}});}
const statusSelect=createSelect('filter'),formatSelect=createSelect('export-format'),videoSelect=createSelect('video-filter',true);
function videoKey(source){return source.platform==='bilibili'?`bilibili:${source.videoId}:p${source.part||1}`:source.videoId||source.url||'';}
function videoTitle(source){return source.platform==='bilibili'?`B站 · ${source.title||source.videoId} · P${source.part||1}${source.partTitle?' '+source.partTitle:''}`:source.title||source.videoId;}
function syncVideos(){const map=new Map();for(const word of words)for(const source of word.sources||[]){const id=videoKey(source);if(id&&!map.has(id))map.set(id,videoTitle(source)||id);}
  const options=[{value:'all',text:'全部来源视频'},...Array.from(map,([value,text])=>({value,text}))];const key=JSON.stringify(options);if(key===videoOptionsKey)return;videoOptionsKey=key;
  const current=videoSelect.getValue();videoSelect.clear(true);videoSelect.clearOptions();videoSelect.addOptions(options);videoSelect.setValue(options.some(o=>o.value===current)?current:'all',true);
}
async function change(id,fn){try{const current=(await chrome.storage.local.get('words')).words||[];const entry=current.find(w=>w.id===id);if(entry)fn(entry,current);await chrome.storage.local.set({words:current});await load();return true;}catch(e){$('notice').textContent='保存失败：'+e.message;return false;}}
function detailId(){return location.hash.startsWith('#word/')?decodeURIComponent(location.hash.slice(6)):null;}
function filteredWords(){const q=$('search').value.toLowerCase().trim(),filter=statusSelect.getValue(),video=videoSelect.getValue();return words.filter(w=>(filter==='all'||w.status===filter)&&(video==='all'||(w.sources||[]).some(s=>videoKey(s)===video))&&JSON.stringify([w.word,w.chinese,w.sources]).toLowerCase().includes(q));}
function render(){
  const id=detailId();$('collection').hidden=Boolean(id);$('detail').hidden=!id;
  if(id){renderDetail(id);return;}
  document.title='句间 · 生词本';
  const q=$('search').value.toLowerCase().trim(),filter=statusSelect.getValue(),video=videoSelect.getValue();
  const list=$('list');list.replaceChildren();$('count').textContent=`${words.length} 个词条 · ${words.reduce((n,w)=>n+(w.sources||[]).length,0)} 条视频来源`;
  const shown=filteredWords();
  $('result-count').textContent=`${shown.length} 个词条`;$('more').hidden=shown.length<=visibleLimit;
  if(!shown.length)list.append(el('p',words.length?'没有匹配的词条，试试其他筛选条件。':'还没有收藏。观看视频时点击单词或拖选词组，即可加入生词本。','empty'));
  for(const w of shown.slice(0,visibleLimit)){
    const a=el('a','','word-row');a.href='#word/'+encodeURIComponent(w.id);a.setAttribute('aria-label','查看 '+w.word+' 详情');a.onclick=()=>{detailSequence=shown.map(item=>item.id);};
    const name=el('span',w.word,'word-name'),summary=el('span',w.chinese||'暂无中文释义','word-summary'),metadata=el('span','','row-meta');
    const videos=new Set((w.sources||[]).map(videoKey).filter(Boolean));metadata.append(el('span',`${videos.size} 个视频`),el('span',w.status==='learned'?'已掌握':'待学习',w.status==='learned'?'state learned':'state'));a.append(name,summary,metadata,el('span','↗','row-arrow'));list.append(a);
  }
}
function renderDetail(id){for(const select of [statusSelect,formatSelect,videoSelect])select.blur();const view=$('detail');view.replaceChildren();const back=el('a','← 返回生词本','back-link');back.href='#';view.append(back);const w=words.find(w=>w.id===id);if(!w){view.append(el('p','此词条已删除或不存在。','empty'));return;}
  if(!detailSequence||!detailSequence.includes(id))detailSequence=words.map(item=>item.id);
  detailSequence=detailSequence.filter(key=>words.some(item=>item.id===key));
  const currentIndex=detailSequence.indexOf(id),navigation=el('div','','word-navigation'),previous=el('button','← 上一个'),next=el('button','下一个 →');
  previous.setAttribute('aria-label','上一个词条');next.setAttribute('aria-label','下一个词条');previous.disabled=currentIndex<=0;next.disabled=currentIndex<0||currentIndex>=detailSequence.length-1;
  previous.title=previous.disabled?'已经是第一个词条':words.find(item=>item.id===detailSequence[currentIndex-1])?.word||'';
  next.title=next.disabled?'已经是最后一个词条':words.find(item=>item.id===detailSequence[currentIndex+1])?.word||'';
  const progress=el('span',`${currentIndex+1} / ${detailSequence.length}`,'meta');progress.setAttribute('aria-label','词条浏览进度');navigation.append(previous,progress,next);view.append(navigation);
  async function navigateWord(direction){const target=detailSequence[currentIndex+direction];if(!target)return;const draft=view.querySelector('textarea');if(draft&&draft.value!==(w.note||'')){if(!await change(w.id,item=>item.note=draft.value))return;}$('notice').textContent='';location.hash='word/'+encodeURIComponent(target);}
  previous.onclick=()=>navigateWord(-1);next.onclick=()=>navigateWord(1);
  document.title=w.word+' · 句间生词本';view.append(el('p',w.kind==='phrase'?'PHRASE / 词组':'WORD / 单词','eyebrow'),el('h1',w.word,'detail-title'),el('p',w.phonetic||'','meta'),el('p',w.chinese||'暂无中文释义','detail-meaning'));
  if(w.translationSource?.name)view.append(el('p','释义来源：'+w.translationSource.name,'meta'));
  const definitions=el('section','','definitions');for(const m of w.meanings||[])definitions.append(el('p',`${m.pos} · ${m.definition}`));view.append(definitions,el('h2','视频语境'));
  if(!(w.sources||[]).length)view.append(el('p','暂无视频来源','meta'));
  for(const s of w.sources||[]){const box=el('div','','source');box.append(el('p',s.sentence||'未记录例句','sentence'));const link=el('a',`${videoTitle(s)||'来源视频'} · ${Math.floor(s.seconds/60)}:${String(Math.floor(s.seconds%60)).padStart(2,'0')} ↗`);try{const u=new URL(s.url);if(u.protocol==='https:'&&((u.hostname==='www.youtube.com'&&u.pathname==='/watch')||(u.hostname==='www.bilibili.com'&&/^\/video\/(BV[a-zA-Z0-9]{10}|av\d+)\/?$/i.test(u.pathname)))){link.href=u.href;link.target='_blank';link.rel='noopener';}}catch{}box.append(link);view.append(box);}
  view.append(el('h2','我的备注'));const note=el('textarea');note.value=w.note||'';note.placeholder='写一点自己的理解…';note.setAttribute('aria-label',w.word+' 的备注');const actions=el('div','','actions'),save=el('button','保存备注','primary'),status=el('button',w.status==='learned'?'标记待学习':'标记已掌握'),remove=el('button','删除词条','danger');
  save.onclick=async()=>{if(await change(w.id,e=>e.note=note.value))$('notice').textContent='备注已保存';};status.onclick=()=>change(w.id,e=>e.status=e.status==='learned'?'new':'learned');remove.onclick=async()=>{if(confirm(`删除 ${w.word} 及其来源记录？`)){if(await change(w.id,(e,all)=>all.splice(all.indexOf(e),1)))location.hash='';}};actions.append(save,status,remove);view.append(note,actions);
}
async function load(){words=(await chrome.storage.local.get('words')).words||[];syncVideos();render();}
$('search').oninput=()=>{visibleLimit=50;render();};$('more').onclick=()=>{visibleLimit+=50;render();};window.addEventListener('hashchange',()=>{if(!detailId())detailSequence=null;render();window.scrollTo(0,0);});chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.words)load();});
$('export').onclick=async()=>{
  try{
    const current=(await chrome.storage.local.get('words')).words||[];
    const format=$('export-format').value;
    const content=format==='csv'?JujianVocabularyBackup.toCSV(current):JSON.stringify({format:'jujian-vocabulary',version:1,exportedAt:new Date().toISOString(),words:current},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}));const a=el('a');a.href=url;a.download=`jujian-vocabulary-${new Date().toISOString().slice(0,10)}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('notice').textContent=`已生成 ${format.toUpperCase()} 文件，共 ${current.length} 个词条`;
  }catch(e){$('notice').textContent='导出失败：'+e.message;}
};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  $('import').disabled=true;$('notice').textContent='正在校验并合并备份…';
  try{
    if(file.size>10*1024*1024)throw Error('文件超过 10 MB，请拆分后导入');
    const text=await file.text();const backup=file.name.toLowerCase().endsWith('.csv')?JujianVocabularyBackup.fromCSV(text):JSON.parse(text.replace(/^\uFEFF/,''));
    JujianVocabularyBackup.validate(backup);
    const result=await chrome.runtime.sendMessage({target:'notebook',type:'import',backup});if(!result?.ok)throw Error(result?.error||'导入失败');
    await load();$('notice').textContent=`导入完成：新增 ${result.added} 个，合并 ${result.merged} 个，共 ${result.total} 个词条`;
  }catch(e){$('notice').textContent='导入失败，原有数据未修改：'+e.message;}
  finally{$('import').disabled=false;e.target.value='';}
};
load();
