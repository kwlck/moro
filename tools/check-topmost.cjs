'use strict';
// Windows integration check. Run: npx electron tools/check-topmost.cjs
// The competing window belongs to a separate process, like a fullscreen game.
const {app,BrowserWindow,screen}=require('electron');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {NativeMotion}=require('../native-motion');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const competing=process.argv.includes('--competitor');
app.setPath('userData',path.join(app.getPath('temp'),'moro-stack-check-'+process.pid));
let driver,child;
const directory=process.env.MORO_STACK_CHECK||fs.mkdtempSync(path.join(os.tmpdir(),'moro-stack-'));
const reportFile=path.join(directory,'report.json'),readyFile=path.join(directory,'competitor.json'),requestFile=path.join(directory,'request.json');
const wait=async(fn)=>{const started=Date.now();while(Date.now()-started<15000){const value=fn();if(value)return value;await sleep(50);}throw Error('check timeout');};
app.whenReady().then(async()=>{
 if(competing){
  const w=new BrowserWindow({...screen.getPrimaryDisplay().bounds,show:false,frame:false,skipTaskbar:true,backgroundColor:'#161616'});
  await w.loadURL('data:text/html,<body style="color:white;font:20px system-ui">Fullscreen stacking check</body>');
  w.setAlwaysOnTop(true,'screen-saver');w.show();
  fs.writeFileSync(readyFile,JSON.stringify({handle:w.getNativeWindowHandle().readBigUInt64LE().toString()}));
  let previous=0;setInterval(()=>{try{const request=JSON.parse(fs.readFileSync(requestFile));if(request.token!==previous){previous=request.token;w.moveTop();fs.writeFileSync(path.join(directory,'raised.json'),JSON.stringify(request));}}catch{}},30);
  return;
 }
 const player=new BrowserWindow({x:160,y:140,width:480,height:270,show:false,frame:false,skipTaskbar:true}),controller=new BrowserWindow({x:660,y:140,width:220,height:180,show:false,frame:false,skipTaskbar:true});
 const handle=w=>w.getNativeWindowHandle().readBigUInt64LE().toString();
 const checks=[],assert=(v,label)=>{if(!v)throw Error(label);checks.push(label);fs.writeFileSync(reportFile,JSON.stringify({ok:false,checks}));};
 try{
  await Promise.all([player.loadURL('data:text/html,PiP stacking check'),controller.loadURL('data:text/html,Controller')]);
  player.setAlwaysOnTop(true,'screen-saver');controller.setAlwaysOnTop(true,'screen-saver');player.showInactive();
  driver=new NativeMotion(path.join(__dirname,'../native/MoroMotion.exe'));assert(await driver.ready,'native helper starts');driver.guard(handle(player),handle(controller));
  child=spawn(process.execPath,[__filename,'--competitor'],{windowsHide:true,env:{...process.env,MORO_STACK_CHECK:directory},stdio:'ignore'});
  const competitor=await wait(()=>{try{return JSON.parse(fs.readFileSync(readyFile))}catch{}});const bounds=player.getBounds();
  let token=0;const compete=async()=>{const current=++token;fs.writeFileSync(requestFile,JSON.stringify({token:current}));await wait(()=>{try{return JSON.parse(fs.readFileSync(path.join(directory,'raised.json'))).token===current}catch{}});};
  await sleep(650);let state=await driver.stack(handle(player));
  assert(state.visible&&state.topmost&&!state.covered,'player stays above a foreign fullscreen topmost window');
  assert(state.foreground===competitor.handle,'fullscreen app keeps keyboard focus');
  const raises=state.raises;await sleep(400);state=await driver.stack(handle(player));assert(state.raises===raises,'unobstructed window is not continuously raised');
  await compete();await sleep(500);state=await driver.stack(handle(player));
  assert(!state.covered&&state.raises>raises&&state.foreground===competitor.handle,'recovers when the game raises itself again without changing focus');
  assert(JSON.stringify(bounds)===JSON.stringify(player.getBounds()),'guard does not change player geometry');
  controller.showInactive();await sleep(250);const controllerBounds=controller.getBounds();
  await compete();await sleep(500);
  assert(!(await driver.stack(handle(controller))).covered,'open controller also stays above the game');
  assert(JSON.stringify(controllerBounds)===JSON.stringify(controller.getBounds()),'controller geometry remains unchanged');
  player.hide();controller.hide();await sleep(350);assert(!(await driver.stack(handle(player))).visible&&!controller.isVisible(),'hidden video and launcher stay hidden');
  fs.writeFileSync(reportFile,JSON.stringify({ok:true,checks},null,2));console.log(JSON.stringify({ok:true,checks,directory},null,2));
 }catch(error){console.error(JSON.stringify({ok:false,checks,error:error.message},null,2));fs.writeFileSync(reportFile,JSON.stringify({ok:false,checks,error:error.message},null,2));process.exitCode=1;}
 finally{child?.kill();driver?.dispose();app.exit(process.exitCode||0);}
});
