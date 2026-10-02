'use strict';
const HISTORY_DAYS=30,HISTORY_LIMIT=50;
function sanitizeHistory(input,now=Date.now()){
 if(!Array.isArray(input))return [];
 const seen=new Set(),items=[];
 for(const item of [...input].sort((a,b)=>(b?.updatedAt||0)-(a?.updatedAt||0))){
  if(!item||typeof item.id!=='string'||!/^[-\w]{11}$/.test(item.id)||seen.has(item.id)||!Number.isFinite(item.updatedAt)||item.updatedAt>now+60000||item.updatedAt<now-HISTORY_DAYS*86400000)continue;
  seen.add(item.id);
  items.push({id:item.id,title:typeof item.title==='string'?item.title.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,160):'',position:Number.isFinite(item.position)?Math.max(0,Math.min(604800,item.position)):0,duration:Number.isFinite(item.duration)?Math.max(0,Math.min(604800,item.duration)):0,updatedAt:item.updatedAt});
  if(items.length===HISTORY_LIMIT)break;
 }
 return items;
}
function rememberVideo(history,id,state,now=Date.now()){
 if(!state?.ready||state.kind!=='youtube'||state.videoId!==id)return sanitizeHistory(history,now);
 const old=history.find(item=>item.id===id);
 const position=state.ended||state.live?0:state.time;
 return sanitizeHistory([{id,title:state.title||old?.title||'',position,duration:state.duration,updatedAt:now},...history.filter(item=>item.id!==id)],now);
}
function resumePosition(item){
 if(!item||!Number.isFinite(item.position)||item.position<3)return 0;
 if(item.duration>0&&item.position>=item.duration-5)return 0;
 return Math.max(0,Math.min(item.position,604800));
}
module.exports={sanitizeHistory,rememberVideo,resumePosition,HISTORY_DAYS,HISTORY_LIMIT};
