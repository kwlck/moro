'use strict';
const $=id=>document.getElementById(id),goo=$('goo-wrap');let settings={},hitAnimation=0,toastTimer;
let dock={x:200,y:552,visible:true};
function layout(){const root=document.documentElement.style;root.setProperty('--anchor-x',dock.x+'px');root.setProperty('--anchor-y',dock.y+'px');for(const p of document.querySelectorAll('.goo-popover')){if(p.hidden)continue;const r=p.getBoundingClientRect(),up=dock.y-128-r.height,down=dock.y+40;root.setProperty('--popover-x',Math.max(r.width/2+12,Math.min(innerWidth-r.width/2-12,dock.x))+'px');root.setProperty('--popover-y',Math.max(12,Math.min(innerHeight-r.height-12,up>=12?up:down))+'px');}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function send(action,value){return window.moro.call(action,value).then(r=>{if(r?.message)toast(r.message);return r;}).catch(()=>toast('Could not complete the action. Please try again.'));}
function sync(s){settings=s;for(const [key,value] of Object.entries(s)){const input=$(key);if(!input)continue;input.value=value;input.style.setProperty('--fill',`${(value-input.min)/(input.max-input.min)*100}%`);$(key+'-value').textContent=value+(['opacity','hoverFade','response','bounce','tint'].includes(key)?'%':' px');}
  const root=document.documentElement.style;root.setProperty('--glass-tint',s.tint/100);root.setProperty('--glass-blur',s.blur+'px');$('goo-filter').querySelector('feGaussianBlur').setAttribute('stdDeviation',s.goo*.65);report();}
function report(){layout();const nodes=dock.visible?[...goo.querySelectorAll('.goo-control'),...goo.querySelectorAll('.goo-popover')].filter(n=>!n.hidden&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).display!=='none'):[];const rects=nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x-4,y:r.y-4,width:r.width+8,height:r.height+8};});window.moro.hitRegions(rects);}
function animateHits(){clearInterval(hitAnimation);report();hitAnimation=setInterval(report,30);setTimeout(()=>{clearInterval(hitAnimation);report();},600);}
function closePanel(){$('goo-url-panel').hidden=true;setHistoryOpen(false);$('goo-settings-panel').hidden=true;$('goo-link').setAttribute('aria-expanded','false');$('goo-settings-toggle').setAttribute('aria-expanded','false');report();}
function toggle(open=!goo.classList.contains('open')){goo.classList.toggle('open',open);window.moro.menuState(open);document.documentElement.style.setProperty('--goo-time',open?'480ms':'340ms');document.querySelectorAll('.goo-node').forEach(n=>n.classList.toggle('is-open',open));goo.querySelectorAll('.sub').forEach(b=>b.tabIndex=open?0:-1);$('goo-toggle').setAttribute('aria-expanded',String(open));$('goo-toggle').setAttribute('aria-label',open?'Close controls':'Open controls');if(!open){document.activeElement?.blur();closePanel();}animateHits();}
function panel(name){const p=$('goo-'+name+'-panel'),open=p.hidden;closePanel();toggle(true);p.hidden=!open;$(name==='url'?'goo-link':'goo-settings-toggle').setAttribute('aria-expanded',String(open));if(open)requestAnimationFrame(()=>name==='url'?$('url').focus():p.querySelector('input').focus());animateHits();}
$('goo-toggle').onclick=()=>toggle();$('goo-settings-toggle').onclick=()=>panel('settings');
$('url-panel-close').onclick=$('settings-panel-close').onclick=()=>toggle(false);
$('goo-link').onclick=async()=>{panel('url');if(!$('goo-url-panel').hidden){const r=await send('clipboard');if(r?.url)$('url').value=r.url;}};
$('url-form').onsubmit=async e=>{e.preventDefault();$('url-help').classList.remove('error');const r=await send('load',$('url').value);if(r?.ok){toggle(false);}else{$('url-help').textContent=r?.message||'Enter a link to a specific YouTube video';$('url-help').classList.add('error');}};

  async function refreshHistory(action='history'){
    const result=await send(action);if(!result?.ok)return;
    const list=$('history-list');list.replaceChildren();$('history-clear').disabled=!result.history.length;
    if(!result.history.length){const empty=document.createElement('p');empty.className='history-empty';empty.textContent="Videos you watch will appear here.";list.append(empty);return;}
    for(const item of result.history){
      const button=document.createElement('button');button.type='button';button.className='history-entry';button.dataset.video=item.id;
      const title=document.createElement('span');title.className='history-title';title.textContent=item.title||"YouTube video";
      const detail=document.createElement('span');detail.className='history-detail';const time=Math.floor(item.position),position=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`;
      detail.textContent=(time>=3&&(item.duration<=0||time<item.duration-5)?"Resume at "+position:"From the start")+' · '+new Intl.DateTimeFormat("en-US",{month:'short',day:'numeric'}).format(item.updatedAt);
      button.append(title,detail);button.onclick=async()=>{button.disabled=true;const opened=await send('load','https://www.youtube.com/watch?v='+item.id);if(opened?.ok)toggle(false);else button.disabled=false;};list.append(button);
    }
  }
  function setHistoryOpen(open){
    $('history-section').hidden=!open;$('goo-url-panel').classList.toggle('history-open',open);
    $('url-panel-title').textContent=open?'History':'Open video';
    $('history-toggle').setAttribute('aria-label',open?'Back to link':'History');$('history-toggle').setAttribute('aria-expanded',String(open));
  }
  $('history-toggle').onclick=async()=>{const open=$('history-section').hidden;setHistoryOpen(open);if(open)await refreshHistory();report();};
  $('history-clear').onclick=()=>refreshHistory('history-clear');

  $('goo-demo').onclick=async()=>{await send('demo');toggle(false);};
$('desktop-preview').onclick=()=>{send('visibility');toggle(false);};
$('goo-center').onclick=()=>{send('center');toggle(false);};$('move-monitor').onclick=()=>{send('monitor');toggle(false);};
$('player-close').onclick=()=>{send('clear');toggle(false);};$('quit-app').onclick=()=>send('quit');
$('goo-video-settings').onclick=()=>{send('video-settings');toggle(false);};
$('reset-settings').onclick=()=>send('reset');
let widthFrame=0,pendingWidth=null;
document.querySelectorAll('.control input').forEach(input=>{
  input.oninput=()=>{sync({...settings,[input.id]:+input.value});if(input.id==='width'){pendingWidth=+input.value;if(!widthFrame)widthFrame=requestAnimationFrame(()=>{widthFrame=0;send('settings',{width:pendingWidth});});}else send('settings',{[input.id]:+input.value});};
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggle(false);return;}if(!e.target.closest('.goo-control')||!goo.classList.contains('open'))return;const id={ArrowLeft:'goo-link',ArrowUp:'goo-settings-toggle',ArrowRight:'desktop-preview',ArrowDown:'goo-toggle',Home:'goo-toggle'}[e.key];if(id){e.preventDefault();$(id).focus();}});
window.moro.onSettings(sync);window.moro.onNotice(toast);window.moro.onOpen(()=>{toggle(true);if($('goo-url-panel').hidden)panel('url');});window.moro.onDismiss(()=>toggle(false));
window.moro.onDock(next=>{dock=next;document.body.classList.toggle('dock-hidden',!dock.visible);if(!dock.visible)toggle(false);report();});
window.addEventListener('resize',report);send('init').then(r=>{if(r?.settings)sync(r.settings);});
