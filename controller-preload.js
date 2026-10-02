'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('moro',Object.freeze({
  call:(action,value)=>ipcRenderer.invoke('moro:control',action,value),
  hitRegions:rects=>ipcRenderer.send('moro:hit-regions',rects),
  menuState:open=>ipcRenderer.send('moro:controller-state',open),
  onDock:callback=>ipcRenderer.on('moro:dock',(_e,data)=>callback(data)),
  onSettings:callback=>ipcRenderer.on('moro:settings',(_e,data)=>callback(data)),
  onNotice:callback=>ipcRenderer.on('moro:notice',(_e,data)=>callback(data)),
  onOpen:callback=>ipcRenderer.on('moro:open',()=>callback()),
  onDismiss:callback=>ipcRenderer.on('moro:dismiss',()=>callback())
}));
