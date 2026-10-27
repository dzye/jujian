(() => {
  const text=(value,max=10000)=>typeof value==='string'?value.slice(0,max):'';
  const cleanSource=s=>s&&typeof s==='object'?{id:text(s.id,100),name:text(s.name,100),provider:text(s.provider,50)}:undefined;
  const cleanTranslation=t=>({source:cleanSource(t?.source),chinese:text(t?.chinese),phonetic:text(t?.phonetic,300),meanings:Array.isArray(t?.meanings)?t.meanings.slice(0,30).map(m=>({pos:text(m?.pos,100),definition:text(m?.definition)})):[]});
  function validate(backup){
    if(!backup||backup.version!==1||!Array.isArray(backup.words)||(backup.format&&backup.format!=='jujian-vocabulary'))throw Error('不是支持的句间备份（version: 1）');
    if(backup.words.length>20000)throw Error('一次最多导入 20000 个词条');
    return backup.words.map((w,i)=>{
      if(!w||typeof w.word!=='string'||!w.word.trim()||w.word.length>200)throw Error(`第 ${i+1} 个词条缺少有效单词或词组`);
      if(w.sources!==undefined&&!Array.isArray(w.sources))throw Error(`第 ${i+1} 个词条的来源格式错误`);
      if((w.sources||[]).length>2000)throw Error('单个词条最多 2000 个来源');
      const sources=(w.sources||[]).map(s=>{
        if(!s||typeof s.seconds!=='number'||!Number.isFinite(s.seconds)||s.seconds<0)throw Error(`第 ${i+1} 个词条的来源时间无效`);
        let id=text(s.bvid||s.videoId,64),platform=s.platform||'youtube',urlPart=1,urlId='';
        if(s.url){let u;try{u=new URL(s.url);}catch{throw Error('来源链接格式错误');}
          if(u.protocol!=='https:')throw Error('来源链接必须使用 HTTPS');
          if(['www.bilibili.com','bilibili.com'].includes(u.hostname)){
            if(s.platform&&s.platform!=='bilibili')throw Error('来源平台与链接不一致');platform='bilibili';urlId=u.pathname.match(/^\/video\/(BV[a-zA-Z0-9]{10}|av\d+)\/?$/i)?.[1]||'';if(!urlId)throw Error('请使用B站普通视频链接');urlPart=Number(u.searchParams.get('p')||1);id=id||urlId;
          }else if(['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(u.hostname)){
            if(s.platform&&s.platform!=='youtube')throw Error('来源平台与链接不一致');platform='youtube';urlId=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||'';id=id||urlId;
          }else throw Error('来源链接必须是 YouTube 或B站视频地址');
          if(urlId&&id!==urlId)throw Error('来源视频标识与链接不一致');
        }
        if(!['youtube','bilibili'].includes(platform))throw Error('不支持的来源平台');
        if(id&&!/^[a-zA-Z0-9_-]{1,64}$/.test(id))throw Error('视频 ID 格式错误');
        const common={platform,videoId:id,title:text(s.title,1000),seconds:s.seconds,cueStart:typeof s.cueStart==='number'&&Number.isFinite(s.cueStart)&&s.cueStart>=0?s.cueStart:s.seconds,sentence:text(s.sentence),createdAt:text(s.createdAt,64)};
        if(platform==='bilibili'){
          if(!/^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(id))throw Error('B站视频标识格式错误');const part=s.part===undefined||s.part===''?urlPart:Number(s.part);
          if(!Number.isInteger(part)||part<1||part>10000||(s.url&&part!==urlPart))throw Error('B站分 P 信息无效或与链接不一致');const cid=String(s.cid||'');if(cid&&!/^\d+$/.test(cid))throw Error('B站 CID 格式错误');
          return {...common,bvid:id,cid,part,partTitle:text(s.partTitle,1000),url:`https://www.bilibili.com/video/${encodeURIComponent(id)}/?p=${part}&t=${Math.floor(s.seconds)}`};
        }
        return {...common,url:id?`https://www.youtube.com/watch?v=${encodeURIComponent(id)}&t=${Math.floor(s.seconds)}s`:''};
      });
      return {id:text(w.id,100),word:w.word.trim().replace(/\s+/g,' ').toLowerCase(),kind:w.kind==='phrase'||/\s/.test(w.word.trim())?'phrase':'word',phonetic:text(w.phonetic,300),chinese:text(w.chinese),meanings:Array.isArray(w.meanings)?w.meanings.slice(0,30).map(m=>({pos:text(m?.pos,100),definition:text(m?.definition)})):[],translationSource:cleanSource(w.translationSource),translations:Array.isArray(w.translations)?w.translations.slice(0,30).map(cleanTranslation):[],note:text(w.note),status:w.status==='learned'?'learned':'new',createdAt:text(w.createdAt,64),sources};
    });
  }
  const sourceKey=s=>JSON.stringify([s.platform||'youtube',s.videoId,s.part||1,String(s.cid||''),Math.round(s.seconds*1000),s.sentence]);
  function merge(existing,incoming){
    const words=JSON.parse(JSON.stringify(existing)),map=new Map(words.map(w=>[w.word.trim().toLowerCase().replace(/\s+/g,' '),w]));let added=0;const merged=new Set();
    for(const item of incoming){let current=map.get(item.word);
      if(!current){current={...item,id:crypto.randomUUID(),createdAt:item.createdAt||new Date().toISOString(),sources:[]};words.push(current);map.set(item.word,current);added++;}
      else merged.add(item.word);
      const seen=new Set((current.sources||[]).map(sourceKey));current.sources=current.sources||[];
      for(const source of item.sources)if(!seen.has(sourceKey(source))){current.sources.push(source);seen.add(sourceKey(source));}
      for(const field of ['chinese','phonetic','note'])if(!current[field]&&item[field])current[field]=item[field];
      if(!current.meanings?.length)current.meanings=item.meanings;
      if(!current.translationSource&&item.translationSource)current.translationSource=item.translationSource;
      current.translations=current.translations||[];for(const value of item.translations||[])if(!current.translations.some(t=>t.source?.id===value.source?.id&&t.chinese===value.chinese))current.translations.push(value);
    }return {words,added,merged:merged.size};
  }
  const columns=['word','kind','chinese','phonetic','status','note','createdAt','meanings_json','video_title','video_id','seconds','cue_start','sentence','video_url','source_created_at','translation_source_json','translations_json','platform','bvid','cid','part','part_title'];
  // Prefix spreadsheet formulas. Import removes exactly this protective prefix.
  const protect=s=>/^[\s]*[=+\-@\t\r]/.test(s)?"'"+s:s;
  const unprotect=s=>/^'[\s]*[=+\-@\t\r]/.test(s)?s.slice(1):s;
  const quote=v=>'"'+protect(String(v??'')).replace(/"/g,'""')+'"';
  function toCSV(words){const rows=[columns];for(const w of words)for(const s of w.sources?.length?w.sources:[{}])rows.push([w.word,w.kind,w.chinese,w.phonetic,w.status,w.note,w.createdAt,JSON.stringify(w.meanings||[]),s.title,s.videoId,s.seconds,s.cueStart,s.sentence,s.url,s.createdAt,JSON.stringify(w.translationSource||null),JSON.stringify(w.translations||[]),s.platform||'youtube',s.bvid,s.cid,s.part,s.partTitle]);return '\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n');}
  function parseCSV(input){const rows=[];let row=[],field='',quoted=false;const s=input.replace(/^\uFEFF/,'');for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=c;}else if(c==='"'){if(field)throw Error('CSV 引号格式错误');quoted=true;}else if(c===','){row.push(unprotect(field));field='';}else if(c==='\r'||c==='\n'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(unprotect(field));if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}if(quoted)throw Error('CSV 引号未闭合');row.push(unprotect(field));if(row.some(Boolean))rows.push(row);return rows;}
  function fromCSV(input){const rows=parseCSV(input),headers=rows.shift();if(!headers||!['word','seconds','video_url'].every(k=>headers.includes(k)))throw Error('请导入句间导出的 CSV，缺少必要列');const words=[];for(const row of rows){if(row.length!==headers.length)throw Error('CSV 列数不一致');const o=Object.fromEntries(headers.map((k,i)=>[k,row[i]]));let meanings=[],translationSource,translations=[];try{meanings=JSON.parse(o.meanings_json||'[]');translationSource=JSON.parse(o.translation_source_json||'null');translations=JSON.parse(o.translations_json||'[]');}catch{throw Error('CSV 释义数据格式错误');}const sources=o.seconds!==''?[{platform:o.platform||undefined,bvid:o.bvid||undefined,cid:o.cid||undefined,part:o.part||undefined,partTitle:o.part_title||undefined,title:o.video_title,videoId:o.video_id,seconds:Number(o.seconds),cueStart:o.cue_start!==''?Number(o.cue_start):Number(o.seconds),sentence:o.sentence,url:o.video_url,createdAt:o.source_created_at}]:[];words.push({word:o.word,kind:o.kind,chinese:o.chinese,phonetic:o.phonetic,status:o.status,note:o.note,createdAt:o.createdAt,meanings,translationSource,translations,sources});}return {format:'jujian-vocabulary',version:1,words};}
  globalThis.JujianVocabularyBackup={validate,merge,toCSV,fromCSV};
})();
