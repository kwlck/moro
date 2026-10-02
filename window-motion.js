'use strict';

// The native region survives page navigation, including YouTube's first paint.
function roundedShape(width,height,radius){
  const r=Math.min(Math.round(radius),Math.floor(width/2),Math.floor(height/2));
  if(r<=0)return [{x:0,y:0,width,height}];
  const rects=[{x:0,y:r,width,height:height-2*r}];
  for(let y=0;y<r;y++){
    const inset=Math.ceil(r-Math.sqrt(r*r-(r-y-.5)**2));
    rects.push({x:inset,y,width:width-2*inset,height:1},{x:inset,y:height-y-1,width:width-2*inset,height:1});
  }
  return rects.filter(rect=>rect.width>0&&rect.height>0);
}

// Evaluate the spring against elapsed time, rather than integrating timer ticks.
// A late frame therefore cannot accumulate velocity or cause a position jump.
function springProgress(seconds,response,bounce){
  const omega=8+response*.10;
  if(bounce<=0)return 1-(1+omega*seconds)*Math.exp(-omega*seconds);
  const damping=1-bounce/24*.18,wd=omega*Math.sqrt(1-damping*damping);
  return 1-Math.exp(-damping*omega*seconds)*(Math.cos(wd*seconds)+damping*omega/wd*Math.sin(wd*seconds));
}
module.exports={roundedShape,springProgress};
