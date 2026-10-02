const test=require('node:test'),assert=require('node:assert/strict');
const {roundedShape,springProgress}=require('../window-motion');
test('native rounded region excludes every corner and covers the full inner window at all allowed radii',()=>{
  for(const radius of [8,18,26,42])for(const [width,height]of [[320,180],[450,253],[960,540]]){
    const region=roundedShape(width,height,radius),contains=(x,y)=>region.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);
    for(const [x,y]of [[0,0],[width-1,0],[0,height-1],[width-1,height-1]])assert.equal(contains(x,y),false);
    for(const r of region){assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);}
    for(let y=radius;y<height-radius;y++)assert.ok(contains(0,y)&&contains(width-1,y));
    assert.ok(contains(width/2,0)&&contains(width/2,height-1));
  }
});
test('default magnetic motion never overshoots or goes backwards even with delayed frames',()=>{
  for(const response of [20,60,100]){
    let previous=0;
    for(const seconds of [0,.016,.032,.048,.14,.15,.35,.55,.9,1.2]){
      const p=springProgress(seconds,response,0);assert.ok(p>=previous&&p<=1);previous=p;
    }
    assert.ok(previous>.9999);
  }
});
