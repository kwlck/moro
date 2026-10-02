'use strict';
const defaults = Object.freeze({"width":610,"radius":26,"opacity":100,"hoverFade":28,"magnet":76,"response":60,"bounce":0,"goo":10,"tint":20,"blur":4,"captions":false,"volume":30,"muted":false,"gooPinned":false,"gooX":null,"gooY":null});
const ranges = {volume:[0,100],width:[320,960],radius:[8,42],opacity:[75,100],hoverFade:[0,90],magnet:[0,128],response:[20,100],bounce:[0,24],goo:[4,16],tint:[20,80],blur:[4,36]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sanitizeSettings(input={}) {const result={...defaults};for(const [key,[a,b]] of Object.entries(ranges))if(Number.isFinite(input[key]))result[key]=clamp(input[key],a,b);if(typeof input.muted==='boolean')result.muted=input.muted;if(typeof input.captions==='boolean')result.captions=input.captions;result.gooPinned=input.gooPinned===true;for(const key of ['gooX','gooY'])if(Number.isFinite(input[key]))result[key]=clamp(input[key],-100000,100000);return result;}
function parseYouTube(raw) {
  if(typeof raw!=='string'||raw.length>2048)return null;
  try {const u=new URL(raw.trim());if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;
    const host=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');let id='';
    if(host==='youtu.be')id=u.pathname.split('/')[1]||'';
    else if(['youtube.com','youtube-nocookie.com'].includes(host)){const p=u.pathname.split('/').filter(Boolean);id=p[0]==='watch'?u.searchParams.get('v')||'':(['shorts','live','embed'].includes(p[0])?p[1]||'':'');}
    return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
  }catch{return null;}
}
function confine(bounds,area,pad=18){return {...bounds,x:Math.round(clamp(bounds.x,area.x+pad,Math.max(area.x+pad,area.x+area.width-bounds.width-pad))),y:Math.round(clamp(bounds.y,area.y+pad,Math.max(area.y+pad,area.y+area.height-bounds.height-pad)))};}
function anchors(bounds,area){const left=area.x+18,right=Math.max(left,area.x+area.width-bounds.width-18),top=area.y+18,bottom=Math.max(top,area.y+area.height-bounds.height-18);return [top,(top+bottom)/2,bottom].flatMap(y=>[left,(left+right)/2,right].map(x=>({x:Math.round(x),y:Math.round(y)})));}
function nearest(bounds,area){return anchors(bounds,area).map(p=>({...p,d:Math.hypot(p.x-bounds.x,p.y-bounds.y)})).sort((a,b)=>a.d-b.d)[0];}
function dockPoint(bounds,area){const right=bounds.x+bounds.width+42,left=bounds.x-42;return {x:Math.round(clamp(right<=area.x+area.width-110?right:left,area.x+110,area.x+area.width-110)),y:Math.round(clamp(bounds.y+Math.min(80,bounds.height/2),area.y+120,area.y+area.height-48))};}
module.exports={defaults,ranges,sanitizeSettings,parseYouTube,confine,anchors,nearest,dockPoint};
