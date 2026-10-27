(() => {
  if(globalThis.JujianCaptionTimeline)return;
  function parse(data){
    const cues=[];
    for(const event of data?.events||[]){
      const start=Number(event.tStartMs)/1000;
      const text=(event.segs||[]).map(s=>s.utf8||'').join('').replace(/\s+/g,' ').trim();
      if(!Number.isFinite(start)||start<0||!text)continue;
      const duration=Number(event.dDurationMs)/1000;
      cues.push({start,end:start+(Number.isFinite(duration)&&duration>0?duration:3),text});
    }
    for(const item of data?.body||[]){const start=Number(item.from),end=Number(item.to),text=String(item.content||'').replace(/\s+/g,' ').trim();if(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&text)cues.push({start,end,text});}
    cues.sort((a,b)=>a.start-b.start);
    const result=[];
    for(const cue of cues){const prior=result.at(-1);if(prior?.start===cue.start){prior.text=cue.text;prior.end=Math.max(prior.end,cue.end);}else result.push(cue);}
    for(let i=0;i<result.length-1;i++)result[i].end=Math.min(result[i].end,result[i+1].start);
    return result;
  }
  function indexAt(cues,time){let lo=0,hi=cues.length-1,found=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(cues[mid].start<=time+.001){found=mid;lo=mid+1;}else hi=mid-1;}return found;}
  function target(cues,time,direction){const i=indexAt(cues,time);if(direction>0)return i+1<cues.length?i+1:-1;if(i<0)return -1;return time>=cues[i].end?i:i-1;}
  globalThis.JujianCaptionTimeline={parse,indexAt,target};
})();
