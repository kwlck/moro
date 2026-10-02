'use strict';
const {ipcRenderer,webFrame}=require('electron');
const bootstrap=ipcRenderer.invoke('moro:bootstrap').then(async config=>{
  if(config)await webFrame.insertCSS(config.css+`\n:root {--window-radius:${config.settings.radius}px;--glass-tint:${config.settings.tint/100};--glass-blur:${config.settings.blur}px}`);
  return config;
});
window.addEventListener('DOMContentLoaded',async()=>{
  const config=await bootstrap;if(!config)return;
  const host=document.createElement('div');host.id='moro-host';
  const dragSurface=document.createElement('div');dragSurface.id='moro-drag-surface';dragSurface.setAttribute('aria-hidden','true');document.body.append(dragSurface);
  function build(node,inSvg=false){if(typeof node==='string')return document.createTextNode(node);const svg=inSvg||node.tag==='svg';const element=svg?document.createElementNS('http://www.w3.org/2000/svg',node.tag):document.createElement(node.tag);for(const [key,value]of Object.entries(node.attrs))element.setAttribute(key,value);for(const child of node.children)element.append(build(child,svg));return element;}
  for(const node of config.tree)host.append(build(node));document.body.append(host);
  const $=id=>host.querySelector('#'+id),ui=$('moro-ui'),goo=$('goo-wrap');
  document.body.classList.add(config.kind==='youtube'?'moro-youtube':'moro-empty');
  let viewportOrigin={x:window.screenX,y:window.screenY},widthDrag=null,pinnedPanel=null,pinFrame=0,widthFrame=0,pendingWidth=null;
  let state={},settings=config.settings,progressDrag=false,qualityRequest='',audioRequest='',timeout;
  function applySettings(s){document.body.classList.toggle('moro-captions-off',!s.captions);if(widthDrag)s={...s,width:+$('width').value};settings=s;document.documentElement.style.setProperty('--hover-opacity',1-s.hoverFade/100);document.documentElement.style.setProperty('--window-radius',s.radius+'px');document.documentElement.style.setProperty('--glass-tint',s.tint/100);document.documentElement.style.setProperty('--glass-blur',s.blur+'px');$('goo-filter').querySelector('feGaussianBlur').setAttribute('stdDeviation',s.goo*.65);
    for(const [key,value]of Object.entries(s)){const input=$(key);if(!input)continue;input.value=value;input.style.setProperty('--fill',`${(value-input.min)/(input.max-input.min)*100}%`);const output=$(key+'-value');if(output)output.textContent=value+(['opacity','hoverFade','response','bounce','tint'].includes(key)?'%':' px');}requestAnimationFrame(layoutGoo);
  }
  function message(text){$('native-status').hidden=!text;$('native-status').textContent=text;clearTimeout(timeout);if(text)timeout=setTimeout(()=>$('native-status').hidden=true,4500);}
  const call=async(action,value)=>{try{const r=await ipcRenderer.invoke('moro:player-action',action,value);if(r?.message)message(r.message);return r;}catch{message('The player is still loading. Please try again.');}};
  const control=async(action,value)=>{try{const r=await ipcRenderer.invoke('moro:control',action,value);if(r?.message)message(r.message);return r;}catch{message('Could not complete the action. Please try again.');}};
  function layoutGoo(){const r=$('apple-settings').getBoundingClientRect();ui.style.setProperty('--anchor-x',r.x+r.width/2+'px');ui.style.setProperty('--anchor-y',r.y+r.height/2+'px');}
  function closePanels(){$('goo-url-panel').hidden=true;setHistoryOpen(false);$('goo-settings-panel').hidden=true;$('goo-link').setAttribute('aria-expanded','false');$('goo-settings-toggle').setAttribute('aria-expanded','false');goo.classList.remove('panel-open');}
  function toggleGoo(open=!ui.classList.contains('goo-open'),focus=false){if(open){menu(false);layoutGoo();}ui.classList.toggle('goo-open',open);goo.classList.toggle('open',open);goo.setAttribute('aria-hidden',String(!open));$('goo-toggle').setAttribute('aria-expanded',String(open));$('goo-toggle').setAttribute('aria-label',open?'Close controls':'Open controls');document.documentElement.style.setProperty('--goo-time',open?'420ms':'280ms');host.querySelectorAll('.goo-node').forEach(n=>n.classList.toggle('is-open',open));goo.querySelectorAll('.sub').forEach(b=>b.tabIndex=open?0:-1);$('goo-toggle').tabIndex=open?0:-1;$('apple-settings').setAttribute('aria-expanded',String(open));$('apple-settings').setAttribute('aria-label','Controls');if(!open){closePanels();if(goo.contains(document.activeElement))document.activeElement.blur();}else if(focus)$('goo-toggle').focus({preventScroll:true});}
  function panel(name){const p=$('goo-'+name+'-panel'),open=p.hidden;closePanels();toggleGoo(true);p.hidden=!open;goo.classList.toggle('panel-open',open);$(name==='url'?'goo-link':'goo-settings-toggle').setAttribute('aria-expanded',String(open));if(open)requestAnimationFrame(()=>name==='url'?$('url').focus():p.querySelector('input').focus());}
  function videoSettings(){toggleGoo(false);menu(true);}
  $('goo-toggle').onclick=()=>toggleGoo(false);$('goo-link').onclick=()=>panel('url');$('goo-settings-toggle').onclick=()=>panel('settings');
  $('goo-video-toggle').onclick=$('goo-video-settings').onclick=videoSettings;
  $('url-panel-close').onclick=$('settings-panel-close').onclick=()=>{closePanels();$('goo-toggle').focus({preventScroll:true});};
  $('url-form').onsubmit=async e=>{e.preventDefault();const help=$('url-help');help.classList.remove('error');const r=await control('load',$('url').value);if(r?.ok)toggleGoo(false);else{help.textContent=r?.message||'Enter a link to a specific YouTube video';help.classList.add('error');}};

  async function refreshHistory(action='history'){
    const result=await control(action);if(!result?.ok)return;
    const list=$('history-list');list.replaceChildren();$('history-clear').disabled=!result.history.length;
    if(!result.history.length){const empty=document.createElement('p');empty.className='history-empty';empty.textContent="Videos you watch will appear here.";list.append(empty);return;}
    for(const item of result.history){
      const button=document.createElement('button');button.type='button';button.className='history-entry';button.dataset.video=item.id;
      const title=document.createElement('span');title.className='history-title';title.textContent=item.title||"YouTube video";
      const detail=document.createElement('span');detail.className='history-detail';const time=Math.floor(item.position),position=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`;
      detail.textContent=(time>=3&&(item.duration<=0||time<item.duration-5)?"Resume at "+position:"From the start")+' · '+new Intl.DateTimeFormat("en-US",{month:'short',day:'numeric'}).format(item.updatedAt);
      button.append(title,detail);button.onclick=async()=>{button.disabled=true;const opened=await control('load','https://www.youtube.com/watch?v='+item.id);if(opened?.ok)toggleGoo(false);else button.disabled=false;};list.append(button);
    }
  }
  function setHistoryOpen(open){
    $('history-section').hidden=!open;$('goo-url-panel').classList.toggle('history-open',open);
    $('url-panel-title').textContent=open?'History':'Open video';
    $('history-toggle').setAttribute('aria-label',open?'Back to link':'History');$('history-toggle').setAttribute('aria-expanded',String(open));
  }
  $('history-toggle').onclick=async()=>{const open=$('history-section').hidden;setHistoryOpen(open);if(open)await refreshHistory();};
  $('history-clear').onclick=()=>refreshHistory('history-clear');

  $('goo-demo').onclick=()=>{toggleGoo(false);control('demo');};
  for(const [id,action]of Object.entries({'goo-center':'center','move-monitor':'monitor','player-close':'clear','quit-app':'quit'}))$(id).onclick=()=>{toggleGoo(false);control(action);};
  $('reset-settings').onclick=()=>control('reset');
  function pinSettings(){if(!pinnedPanel)return;const p=$('goo-settings-panel');p.style.setProperty('inset',`${pinnedPanel.y-viewportOrigin.y}px auto auto ${pinnedPanel.x-viewportOrigin.x}px`,'important');p.style.setProperty('width',pinnedPanel.width+'px','important');p.style.setProperty('max-height',pinnedPanel.height+'px','important');}
  function pinLoop(){pinSettings();if(pinnedPanel)pinFrame=requestAnimationFrame(pinLoop);}
  function unpinSettings(){if(!pinnedPanel||widthDrag)return;cancelAnimationFrame(pinFrame);const p=$('goo-settings-panel'),from=p.getBoundingClientRect();pinnedPanel=null;for(const key of ['inset','width','max-height'])p.style.removeProperty(key);const to=p.getBoundingClientRect();if(!p.hidden)p.animate([{transform:`translate(${from.x-to.x}px,${from.y-to.y}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)'});}
  function flushWidth(){cancelAnimationFrame(widthFrame);widthFrame=0;if(pendingWidth===null)return Promise.resolve();const width=pendingWidth;pendingWidth=null;return control('settings',{width});}
  function queueWidth(width){pendingWidth=width;if(!widthFrame)widthFrame=requestAnimationFrame(flushWidth);}
  function scrubWidth(e){if(!widthDrag)return;const w=$('width'),fraction=Math.max(0,Math.min(1,(e.screenX-widthDrag.left-5)/(widthDrag.width-10))),value=Math.round((+w.min+fraction*(w.max-w.min))/w.step)*w.step;w.value=value;w.dispatchEvent(new Event('input',{bubbles:true}));}
  async function endWidthDrag(e){if(!widthDrag)return;const id=widthDrag.id;if(e?.type==='pointerup')scrubWidth(e);widthDrag=null;if($('width').hasPointerCapture(id))$('width').releasePointerCapture(id);await flushWidth();await control('resize-gesture',false);}
  goo.querySelectorAll('.control input').forEach(input=>{
    input.oninput=()=>{applySettings({...settings,[input.id]:+input.value});if(input.id==='width')queueWidth(+input.value);else control('settings',{[input.id]:+input.value});};
  });
  $('width').onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const p=$('goo-settings-panel');p.getAnimations().forEach(a=>a.cancel());const r=p.getBoundingClientRect(),track=$('width').getBoundingClientRect();viewportOrigin={x:window.screenX,y:window.screenY};pinnedPanel={x:window.screenX+r.x,y:window.screenY+r.y,width:r.width,height:r.height};widthDrag={id:e.pointerId,left:window.screenX+track.left,width:track.width};$('width').focus({preventScroll:true});$('width').setPointerCapture(e.pointerId);control('resize-gesture',true);cancelAnimationFrame(pinFrame);pinLoop();scrubWidth(e);};
  $('width').onpointermove=scrubWidth;$('width').onpointerup=endWidthDrag;$('width').onpointercancel=endWidthDrag;
  let resizeClockFrame=0;ipcRenderer.on('moro:resize-clock',(_e,on)=>{cancelAnimationFrame(resizeClockFrame);if(on){const tick=()=>{ipcRenderer.send('moro:resize-tick');resizeClockFrame=requestAnimationFrame(tick);};resizeClockFrame=requestAnimationFrame(tick);}});
  ipcRenderer.on('moro:resize-viewport',(_e,bounds)=>{viewportOrigin={x:bounds.x,y:bounds.y};pinSettings();});
  ipcRenderer.on('moro:resize-end',unpinSettings);
  window.addEventListener('resize',()=>{pinSettings();layoutGoo();});
  const fmt=n=>{const s=Math.max(0,Math.floor(n||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
  const label=q=>({auto:'Auto',tiny:'144p',small:'240p',medium:'360p',large:'480p',hd720:'720p',hd1080:'1080p',hd1440:'1440p',hd2160:'2160p',highres:'Highest','540':'540p','360':'360p'}[q]||q);
  function options(container,choices,current,action){const signature=JSON.stringify([choices,current]);if(container.dataset.signature===signature)return;container.dataset.signature=signature;container.replaceChildren();if(!choices.length){const note=document.createElement('span');note.textContent=state.ready?'Unavailable for this video':'Loading…';container.append(note);return;}
    for(const item of choices){const button=document.createElement('button');button.type='button';button.textContent=item.name;button.disabled=item.disabled===true;button.setAttribute('aria-pressed',String(item.id===current));button.dataset.option=item.id;button.onclick=async()=>{const result=await call(action,action==='captions'?item.id==='on':item.id);if(result?.ok){if(action==='quality'){qualityRequest=item.id;message('Quality: '+item.name);}else if(action==='captions'){message("Subtitles: "+item.name);}else{audioRequest=item.id;message('Audio track: '+item.name);}}};container.append(button);}}
  function menus(){const qualities=state.qualities||[];const values=(state.kind==='youtube'&&qualities.length?[...new Set(['auto',...qualities])]:qualities).map(q=>({id:q,name:label(q)}));options($('quality-options'),values,state.quality,'quality');options($('audio-options'),state.audio||[],state.audioId,'audio');options($('captions-options'),[{id:'off',name:"Off"},{id:'on',name:"On",disabled:!state.captionsAvailable}],state.captions?'on':'off','captions');$('video-menu-note').textContent=state.kind==='demo'?'The demo has one audio track.':'YouTube provides the available audio tracks and quality levels. The current quality is selected.';}
  function sync(next){state=next;document.body.classList.toggle('moro-empty',next.kind==='empty');if(next.kind==='demo')document.getElementById('empty').hidden=true;
    $('apple-play').disabled=!next.ready;$('apple-play').classList.toggle('playing',next.playing);$('apple-play').setAttribute('aria-label',next.playing?'Pause':'Play');$('apple-mute').classList.toggle('muted',next.muted);$('apple-mute').setAttribute('aria-label',next.muted?'Unmute':'Mute');
    $('apple-rate').textContent=(next.rate||1).toLocaleString('en-US')+'×';$('apple-rate').setAttribute('aria-label','Speed '+(next.rate||1)+'×');
    $('apple-current-time').textContent=fmt(next.time);$('apple-remaining-time').textContent='−'+fmt(next.duration-next.time);
    if(!progressDrag){const fraction=next.duration?next.time/next.duration:0;$('apple-progress').value=Math.round(fraction*1000);$('apple-progress').style.setProperty('--played',fraction*100+'%');}
    if(document.activeElement!==$('apple-volume')){$('apple-volume').value=next.volume??70;$('apple-volume').style.setProperty('--volume',(next.volume??70)+'%');}
    if(!$('video-settings').hidden)menus();
    if(qualityRequest&&next.quality===qualityRequest){message('Quality: '+label(next.quality));qualityRequest='';}if(audioRequest&&next.audioId===audioRequest){message('Audio track changed');audioRequest='';}
    if(next.error){$('native-status').textContent=next.error;$('native-status').hidden=false;}else if(next.kind==='youtube'&&!next.ready){$('native-status').textContent='Opening YouTube…';$('native-status').hidden=false;}else if($('native-status').textContent==='Opening YouTube…')$('native-status').hidden=true;
  }
  function menu(open=!ui.classList.contains('menu-open'),focus=false){ui.classList.toggle('menu-open',open);$('video-settings').hidden=!open;$('apple-settings').setAttribute('aria-expanded',String(open));if(open){menus();if(focus)$('video-settings-close').focus({preventScroll:true});}else document.activeElement?.blur();}
  $('apple-play').onclick=()=>call('play');$('apple-rewind').onclick=()=>call('seek',Math.max(0,(state.time||0)-10));$('apple-forward').onclick=()=>call('seek',Math.min(state.duration||0,(state.time||0)+10));
  $('apple-mute').onclick=()=>call('mute');$('apple-volume').oninput=e=>{e.target.style.setProperty('--volume',e.target.value+'%');call('volume',+e.target.value);};
  $('apple-rate').onclick=()=>{const rates=[.5,.75,1,1.25,1.5,2];call('rate',rates[(rates.indexOf(state.rate)+1)%rates.length]);};
  $('apple-progress').oninput=e=>{progressDrag=true;e.target.style.setProperty('--played',e.target.value/10+'%');};$('apple-progress').onchange=e=>{progressDrag=false;call('seek',(state.duration||0)*e.target.value/1000);};
  $('apple-settings').onclick=e=>toggleGoo(undefined,e.detail===0);$('video-settings-close').onclick=()=>{menu(false);toggleGoo(true);};$('native-close').onclick=()=>call('close');
  // Native cursor tracking decides when the pointer leaves the entire window.
  // A bubbling child pointerleave must not close the menu while moving between buttons.
  for(const type of ['click','pointerdown','pointerup','input','change'])ui.addEventListener(type,e=>e.stopPropagation());
  // Ctrl reveals these controls, so handle the wheel before browser zoom or
  // YouTube's page handlers can consume it. Keep scrolling inside the panel.
  window.addEventListener('wheel',e=>{
    const panel=e.target.closest?.('#moro-ui .goo-settings-panel,#moro-ui .video-settings,#moro-ui .goo-url-panel');
    if(!panel||panel.hidden||!ui.classList.contains('ctrl-held'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const scroller=e.target.closest?.('.history-list')||panel.querySelector('.goo-settings-body')||panel;
    const unit=e.deltaMode===1?18:e.deltaMode===2?scroller.clientHeight:1;
    const before=scroller.scrollTop;scroller.scrollTop+=e.deltaY*unit;scroller.scrollLeft+=e.deltaX*unit;if(scroller!==panel&&scroller.scrollTop===before)panel.scrollTop+=e.deltaY*unit;
  },{capture:true,passive:false});
  window.addEventListener('click',e=>{if(e.target.closest('button,input,a,select,textarea,[role=button],.ytp-ad-overlay-container'))return;e.preventDefault();e.stopImmediatePropagation();},true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();toggleGoo(false);menu(false);return;}if(goo.contains(e.target)&&e.target.closest('.goo-control')&&ui.classList.contains('goo-open')){const target={ArrowLeft:'goo-link',ArrowUp:'goo-settings-toggle',ArrowRight:'goo-video-toggle',ArrowDown:'goo-toggle'}[e.key];if(target){e.preventDefault();e.stopImmediatePropagation();$(target).focus();return;}}if(e.target.closest('input,button'))return;if(['Space','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Space')call('play');if(e.key==='ArrowLeft')call('seek',Math.max(0,(state.time||0)-10));if(e.key==='ArrowRight')call('seek',Math.min(state.duration||0,(state.time||0)+10));}},true);
  ipcRenderer.on('moro:settings',(_e,s)=>applySettings(s));ipcRenderer.on('moro:state',(_e,s)=>sync(s));ipcRenderer.on('moro:notice',(_e,text)=>message(text));ipcRenderer.on('moro:menu',()=>{ui.classList.add('hover');videoSettings();});ipcRenderer.on('moro:goo-open',(_e,name)=>{ui.classList.add('hover');toggleGoo(true);if(name==='url')panel('url');});ipcRenderer.on('moro:dragging',(_e,on)=>{document.body.classList.toggle('moro-dragging',on);if(on){toggleGoo(false);menu(false);}});
  function interaction({ctrl,inside}){if(!ctrl&&widthDrag)endWidthDrag();ui.classList.toggle('ctrl-held',ctrl);ui.classList.toggle('hover',ctrl&&inside);document.body.classList.toggle('moro-passive-hover',inside&&!ctrl);if(!ctrl||!inside){toggleGoo(false);menu(false);}}
  ipcRenderer.on('moro:interaction',(_e,value)=>interaction(value));
  ipcRenderer.on('moro:hover',(_e,on)=>{ui.classList.toggle('hover',on);if(!on){toggleGoo(false);menu(false);}});
  $('apple-settings').setAttribute('aria-label','Controls');$('apple-settings').setAttribute('aria-controls','goo-wrap');toggleGoo(false);applySettings(config.settings);ipcRenderer.send('moro:overlay-ready');
});
