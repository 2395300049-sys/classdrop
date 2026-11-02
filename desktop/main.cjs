'use strict';
const {app,BrowserWindow,WebContentsView,Menu,ipcMain,session,shell,dialog}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {DEFAULT_SERVICE,serviceOrigin,classify,safeFilename}=require('./policy.cjs');
const TOOLBAR=72,FOOTER=30;const SHELL=pathToFileURL(path.join(__dirname,'renderer/index.html')).href;
let win,view,store,partition,origin=DEFAULT_SERVICE,modal=null,failed=false,loading=true;
let state={status:'正在连接收件服务…',service:origin,loading:true,canGoBack:false,downloads:[],version:app.getVersion(),error:null};

function prefs(){try{return JSON.parse(fs.readFileSync(store,'utf8'));}catch{return {};}}
function persist(){const next={service:origin,downloads:state.downloads.filter(d=>d.status==='completed').slice(0,30)};fs.mkdirSync(path.dirname(store),{recursive:true});fs.writeFileSync(store+'.tmp',JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(store+'.tmp',store);}
function emit(patch={}){state={...state,...patch,service:origin,canGoBack:!!view&&!view.webContents.isDestroyed()&&view.webContents.navigationHistory.canGoBack()};if(win&&!win.isDestroyed())win.webContents.send('classdrop:state',state);}
function visibility(){if(view)view.setVisible(!modal&&!failed&&!loading);}
function resize(){if(!win||!view)return;const {width,height}=win.getContentBounds();view.setBounds({x:0,y:TOOLBAR,width,height:Math.max(0,height-TOOLBAR-FOOTER)});}
function error(message){failed=true;loading=false;visibility();emit({loading:false,error:message,status:'连接未完成'});}
async function load(url=origin){failed=false;loading=true;visibility();emit({error:null,loading:true,status:'正在连接收件服务…'});try{await view.webContents.loadURL(url);}catch(e){if(e.code!=='ERR_ABORTED')error('暂时无法打开云端服务。请检查网络或稍后重试。');}}
async function external(url){const kind=classify(url,origin);if(kind==='blocked')return false;await shell.openExternal(url);return true;}
function navigation(contents){
 contents.setWindowOpenHandler(({url})=>{const kind=classify(url,origin);if(kind==='service'||kind==='external')external(url);return {action:'deny'};});
 contents.on('will-navigate',(event,url)=>{const kind=classify(url,origin);if(kind==='service')return;event.preventDefault();if(kind==='external')external(url);});
 contents.on('will-redirect',(event,url)=>{const kind=classify(url,origin);if(kind==='service')return;event.preventDefault();if(kind==='external')external(url);else error('服务尝试跳转到未经允许的地址，已停止跳转。');});
 contents.on('will-attach-webview',event=>event.preventDefault());
}
function setupDownloads(){partition.on('will-download',(event,item,contents)=>{
 if(!view||contents!==view.webContents||classify(contents.getURL(),origin)!=='service'){event.preventDefault();return;}
 const id=require('node:crypto').randomUUID(),name=safeFilename(item.getFilename());
 item.setSaveDialogOptions({title:'保存收件文件',defaultPath:path.join(app.getPath('downloads'),name),properties:['createDirectory','showOverwriteConfirmation']});
 const record={id,name,status:'progressing',received:0,total:item.getTotalBytes(),created:new Date().toISOString(),path:''};state.downloads=[record,...state.downloads].slice(0,30);emit({status:'正在保存 '+name});
 item.on('updated',(_,status)=>{record.status=status;record.received=item.getReceivedBytes();record.total=item.getTotalBytes();if(win)win.setProgressBar(record.total?record.received/record.total:2);emit();});
 item.once('done',(_,status)=>{record.status=status;record.path=status==='completed'?item.getSavePath():'';if(win)win.setProgressBar(-1);persist();emit({status:status==='completed'?'已保存 '+name:status==='cancelled'?'已取消保存':'下载中断，请重试'});});
 });}
function trusted(event){return !!win&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&win.webContents.getURL()===SHELL;}
function commands(command){
 if(command==='home')return load();if(command==='back'){if(view.webContents.navigationHistory.canGoBack())view.webContents.navigationHistory.goBack();return;}
 if(command==='reload')return failed?load():view.webContents.reload();
 if(command==='browser')return external(classify(view.webContents.getURL(),origin)==='service'?view.webContents.getURL():origin);
 if(command==='settings'||command==='downloads'){modal=command;visibility();emit({modal});return;}
 if(command==='close-modal'){modal=null;visibility();emit({modal:null});return;}
 if(command==='downloads-folder')return shell.openPath(app.getPath('downloads'));
}
function createWindow(){
 partition=session.fromPartition('persist:classdrop');partition.setPermissionRequestHandler((contents,permission,cb)=>cb(permission==='clipboard-sanitized-write'&&!!view&&contents===view.webContents&&classify(contents.getURL(),origin)==='service'));partition.setPermissionCheckHandler((contents,permission,requestingOrigin)=>permission==='clipboard-sanitized-write'&&!!view&&contents===view.webContents&&classify(requestingOrigin,origin)==='service');
 win=new BrowserWindow({width:1280,height:860,minWidth:820,minHeight:580,title:'一码收',backgroundColor:'#f5f7f1',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true}});
 view=new WebContentsView({webPreferences:{session:partition,contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true,allowRunningInsecureContent:false}});win.contentView.addChildView(view);view.setVisible(false);resize();navigation(view.webContents);setupDownloads();
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(url!==SHELL)e.preventDefault();});
 win.on('resize',resize);win.on('closed',()=>{if(view&&!view.webContents.isDestroyed())view.webContents.close();win=null;view=null;});
 view.webContents.on('did-start-loading',()=>emit({status:'正在加载…'}));
 view.webContents.on('did-finish-load',()=>{loading=false;if(!failed){visibility();emit({loading:false,error:null,status:'已连接 · 云端文件按日期保存'});}});
 view.webContents.on('did-navigate',(_,url,code)=>{if(code>=400){error('云端返回 HTTP '+code+'。可检查网络或稍后重试。');return;}emit();});
 view.webContents.on('did-fail-load',(_,code,description,url,main)=>{if(main&&code!==-3)error('暂时无法连接云端服务（'+description+'）。请检查网络或更改服务地址。');});
 view.webContents.on('render-process-gone',()=>error('页面进程已停止，点击重新连接即可恢复。'));
 win.loadFile(path.join(__dirname,'renderer/index.html'));win.webContents.once('did-finish-load',()=>{emit();load();});
 const items=[...(process.platform==='darwin'?[{label:'一码收',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]}]:[]),{label:'文件',submenu:[{label:'打开收件工作台',accelerator:'CmdOrCtrl+H',click:()=>commands('home')},{label:'最近下载',accelerator:'CmdOrCtrl+J',click:()=>commands('downloads')},{label:'服务设置',accelerator:'CmdOrCtrl+,',click:()=>commands('settings')},...(process.platform==='darwin'?[]:[{role:'quit'}])]},{role:'editMenu',label:'编辑'},{label:'查看',submenu:[{label:'刷新',accelerator:'CmdOrCtrl+R',click:()=>commands('reload')},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},{label:'帮助',submenu:[{label:'使用与保存说明',click:()=>load(origin+'/help')},{label:'GitHub 项目与下载',click:()=>external('https://github.com/2395300049-sys/classdrop')},{label:'在浏览器打开',click:()=>commands('browser')}]}];Menu.setApplicationMenu(Menu.buildFromTemplate(items));
}
ipcMain.handle('classdrop:get-state',event=>{if(!trusted(event))throw new Error('Forbidden');return state;});
ipcMain.handle('classdrop:command',(event,command)=>{if(!trusted(event))throw new Error('Forbidden');if(!['home','back','reload','browser','settings','downloads','close-modal','downloads-folder'].includes(command))throw new Error('Unknown command');return commands(command);});
ipcMain.handle('classdrop:service',async(event,value)=>{if(!trusted(event))throw new Error('Forbidden');origin=serviceOrigin(String(value));modal=null;persist();emit({modal:null});await load();return origin;});
ipcMain.handle('classdrop:show-download',(event,id)=>{if(!trusted(event))throw new Error('Forbidden');const record=state.downloads.find(d=>d.id===id&&d.status==='completed');if(record?.path&&fs.existsSync(record.path))shell.showItemInFolder(record.path);});
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.whenReady().then(()=>{store=path.join(app.getPath('userData'),'settings.json');const config=prefs();try{origin=serviceOrigin(config.service||DEFAULT_SERVICE);}catch{origin=DEFAULT_SERVICE;}state.service=origin;state.downloads=Array.isArray(config.downloads)?config.downloads.slice(0,30):[];createWindow();app.on('activate',()=>{if(!win)createWindow();});});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
