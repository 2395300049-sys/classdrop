'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('classdrop',Object.freeze({
 getState:()=>ipcRenderer.invoke('classdrop:get-state'),
 command:value=>ipcRenderer.invoke('classdrop:command',value),
 saveService:value=>ipcRenderer.invoke('classdrop:service',value),
 showDownload:id=>ipcRenderer.invoke('classdrop:show-download',id),
 onState:callback=>{const listener=(_,state)=>callback(state);ipcRenderer.on('classdrop:state',listener);return()=>ipcRenderer.removeListener('classdrop:state',listener);},
}));
