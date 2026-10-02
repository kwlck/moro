const test=require('node:test'),assert=require('node:assert/strict');
const {parseYouTube,sanitizeSettings,defaults,confine,nearest,anchors,dockPoint}=require('../core');
test('video URLs accept supported formats and reject deceptive or executable URLs',()=>{
  for(const url of ['https://youtube.com/watch?v=M7lc1UVf-VE','https://youtu.be/M7lc1UVf-VE?t=12','https://m.youtube.com/shorts/M7lc1UVf-VE','https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'])assert.equal(parseYouTube(url),'M7lc1UVf-VE');
  for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://youtube.com@evil.test/watch?v=M7lc1UVf-VE','https://user:pw@youtube.com/watch?v=M7lc1UVf-VE','https://youtube.com/watch?v=bad','file:///video.mp4'])assert.equal(parseYouTube(url),null);
});
test('Gooey follows the free side of video and keeps its fan inside the monitor',()=>{
  const area={x:0,y:0,width:1920,height:1040};assert.equal(dockPoint({x:1442,y:763,width:460,height:259},area).x,1400);
  assert.equal(dockPoint({x:18,y:18,width:460,height:259},area).x,520);
  assert.equal(dockPoint({x:18,y:18,width:460,height:259},area).y,120);
  assert.equal(sanitizeSettings({gooPinned:true,gooX:-1300,gooY:500}).gooX,-1300);
});
test('settings reject invalid numeric input and clamp native window values',()=>{assert.deepEqual(sanitizeSettings({width:Infinity,radius:NaN,tint:'55'}),defaults);const s=sanitizeSettings({width:999999,opacity:-10,bounce:100,other:1});assert.equal(s.width,960);assert.equal(s.opacity,75);assert.equal(s.bounce,24);assert.equal(s.other,undefined);});
test('magnetic anchors use monitor work area including negative desktop coordinates',()=>{
  const a={x:-1920,y:80,width:1920,height:1000},b={x:-1910,y:60,width:460,height:259};const safe=confine(b,a);assert.equal(safe.x,-1902);assert.equal(safe.y,98);const points=anchors(b,a);assert.equal(points.length,9);assert.equal(points[8].x,-478);assert.equal(points[8].y,803);assert.equal(nearest({...b,...points[8]},a).d,0);
});
