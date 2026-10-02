'use strict';
// This fixed function runs in the player's page. Values never become executable code.
function playerOperation(action,value) {
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const v=document.getElementById('demo-video');
  const p=document.getElementById('movie_player');
  const local=!!v;
  const trackId=t=>String(t?.id||t?.getLanguageInfo?.()?.id||t?.To?.id||'');
  const tracks=()=>p?.getAvailableAudioTracks?.()||[];
  const captionsAvailable=()=>!!(p?.isSubtitlesOn?.()||p?.getOption?.('captions','tracklist')?.length);
  function setCaptions(enabled){
    document.body.classList.toggle('moro-captions-off',!enabled);
    if(p&&typeof p.isSubtitlesOn==='function'&&typeof p.toggleSubtitles==='function'&&p.isSubtitlesOn()!==enabled&&(captionsAvailable()||!enabled))p.toggleSubtitles();
    if(local)for(const track of v.textTracks)track.mode=enabled?'showing':'disabled';
  }
  if(action==='captions'){
    if(value&&!(local?v.textTracks.length:captionsAvailable()))return {ok:false,message:"Subtitles are unavailable for this video"};
    setCaptions(value);return {ok:true};
  }
  if(action==='stop'){if(local){v.pause();v.removeAttribute('src');v.load();}else p?.stopVideo?.();return {ok:true};}
  if(action==='restore'){
    if(local){v.volume=value.volume/100;v.muted=value.muted;if(value.time)v.currentTime=value.time;}
    else{if(!p?.setVolume)return {ok:false};p.setVolume(value.volume);value.muted||value.volume===0?p.mute():p.unMute();if(value.time)p.seekTo(Math.min(value.time,p.getDuration()||value.time),true);if(value.play)p.playVideo();}
    return {ok:true};
  }
  if(action==='demo') {
    v.src=value.src;v.muted=value.muted??true;v.volume=(value.volume??30)/100;v.dataset.quality='540';v.play().catch(()=>{});
    document.getElementById('empty').hidden=true;document.body.classList.remove('moro-empty');return true;
  }
  if(action==='state') {
    if(typeof value?.captions==='boolean')setCaptions(value.captions);
    if(local){return {kind:v.hasAttribute('src')?'demo':'empty',ready:v.readyState>=2,time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:0,playing:!v.paused,muted:v.muted,volume:v.volume*100,rate:v.playbackRate,quality:v.dataset.quality||'540',qualities:['540','360'],audio:[{id:'original',name:'Original'}],audioId:'original',captionsAvailable:!!v.textTracks.length,captions:!document.body.classList.contains('moro-captions-off')&&[...v.textTracks].some(t=>t.mode==='showing'),error:v.error?'Could not open the demo video.':''};}
    if(!p?.getPlayerState)return {kind:'youtube',ready:false,qualities:[],audio:[],captionsAvailable:false,captions:false,error:''};
    const audio=tracks().map(t=>{const info=t.getLanguageInfo?.()||t.To||t;return {id:trackId(t),name:String(info.getName?.()||info.name||t.displayName||info.displayName||trackId(t))};}).filter(t=>t.id);
    const error=document.querySelector('.ytp-error-content-wrap')?.innerText||'';
    const data=p.getVideoData?.()||{};
    return {kind:'youtube',videoId:data.video_id||'',title:data.title||'',ended:p.getPlayerState()===0,live:data.isLive===true,ready:!!p.getDuration?.(),time:p.getCurrentTime?.()||0,duration:p.getDuration?.()||0,playing:p.getPlayerState()===1,muted:p.isMuted?.()||false,volume:p.getVolume?.()??70,rate:p.getPlaybackRate?.()||1,quality:p.getPlaybackQuality?.()||'auto',qualities:p.getAvailableQualityLevels?.()||[],audio,audioId:trackId(p.getAudioTrack?.()),captionsAvailable:captionsAvailable(),captions:!document.body.classList.contains('moro-captions-off')&&!!p.isSubtitlesOn?.(),error:error.slice(0,300)};
  }
  if(!local&&!p?.getPlayerState)return {ok:false,message:'The player is still loading'};
  if(action==='play')local?(v.paused?v.play().catch(()=>{}):v.pause()):(p.getPlayerState()===1?p.pauseVideo():p.playVideo());
  if(action==='seek'){const time=clamp(value,0,local?v.duration||0:p.getDuration()||0);local?v.currentTime=time:p.seekTo(time,true);}
  if(action==='volume'){local?(v.volume=value/100,v.muted=value===0):(p.setVolume(value),value>0?p.unMute():p.mute());}
  if(action==='mute')local?v.muted=!v.muted:(p.isMuted()?p.unMute():p.mute());
  if(action==='rate')local?v.playbackRate=value:p.setPlaybackRate(value);
  if(action==='quality'){
    if(local){const position=v.currentTime,paused=v.paused,volume=v.volume,muted=v.muted,rate=v.playbackRate;v.pause();v.src=value.src;v.dataset.quality=value.id;
      v.addEventListener('loadedmetadata',()=>{if(v.dataset.quality!==value.id)return;v.currentTime=Math.min(position,v.duration);v.volume=volume;v.muted=muted;v.playbackRate=rate;if(!paused)v.play().catch(()=>{});},{once:true});v.load();
    }else{const list=p.getAvailableQualityLevels?.()||[];if(value!=='auto'&&!list.includes(value))return {ok:false,message:'This quality is currently unavailable'};
      if(typeof p.setPlaybackQualityRange!=='function')return {ok:false,message:'YouTube did not provide quality switching'};
      p.setPlaybackQualityRange(value,value);p.setPlaybackQuality?.(value);
    }
  }
  if(action==='audio'){
    if(local)return {ok:false,message:'The demo has one audio track'};
    const t=tracks().find(t=>trackId(t)===value);if(!t||typeof p.setAudioTrack!=='function')return {ok:false,message:'Audio track unavailable'};
    if(p.setAudioTrack(t)===false)return {ok:false,message:'YouTube could not change the audio track'};
  }
  return {ok:true};
}
module.exports={playerOperation};
