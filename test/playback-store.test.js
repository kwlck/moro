const test=require('node:test'),assert=require('node:assert/strict');
const {sanitizeHistory,rememberVideo,resumePosition}=require('../playback-store');
test('history expires old entries, removes invalid records and limits storage',()=>{
 const now=Date.now(),entry={id:'M7lc1UVf-VE',title:'Example',position:20,duration:100,updatedAt:now};
 const list=sanitizeHistory([entry,{...entry,title:'duplicate'},{...entry,id:'invalid'},{...entry,id:'y9n6HkftavM',updatedAt:now-31*86400000}],now);
 assert.equal(list.length,1);assert.equal(list[0].title,'Example');
 assert.equal(sanitizeHistory(Array.from({length:80},(_,i)=>({...entry,id:String(i).padStart(11,'0')})),now).length,50);
});
test('history checkpoints only the loaded video and resumes unfinished playback',()=>{
 const now=Date.now(),s={kind:'youtube',videoId:'M7lc1UVf-VE',ready:true,time:401.25,duration:900,title:'Example'};
 const list=rememberVideo([],s.videoId,s,now);assert.equal(resumePosition(list[0]),401.25);
 assert.deepEqual(rememberVideo(list,'y9n6HkftavM',s,now),list);
 assert.equal(resumePosition({...list[0],position:898}),0);
 assert.equal(resumePosition(rememberVideo(list,s.videoId,{...s,ended:true},now)[0]),0);
});
