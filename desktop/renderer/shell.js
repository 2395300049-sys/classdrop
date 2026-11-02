'use strict';
const $=id=>document.getElementById(id);
let current;
function render(state){
 current=state;$('status-text').textContent=state.status;$('service-label').textContent=new URL(state.service).hostname;$('status-dot').classList.toggle('error',!!state.error);$('back').disabled=!state.canGoBack;
 $('settings').hidden=state.modal!=='settings';$('downloads').hidden=state.modal!=='downloads';$('connection-text').textContent=state.error||'正在连接云端收件服务…';$('headline').textContent=state.error?'暂时没有连上服务':'文件，收得井井有条。';$('error-actions').hidden=!state.error;
 $('version').textContent='一码收 '+state.version+' · 桌面试用版';if(document.activeElement!==$('service-input'))$('service-input').value=state.service;
 const list=$('download-list');list.replaceChildren();
 if(!state.downloads.length){const p=document.createElement('p');p.className='download-empty';p.textContent='还没有下载记录。从收件箱下载文件后会显示在这里。';list.append(p);}
 for(const item of state.downloads){const row=document.createElement('div');row.className='download';const info=document.createElement('div'),name=document.createElement('b'),note=document.createElement('small');name.textContent=item.name;const status={completed:'已保存',progressing:'正在下载',interrupted:'下载中断',cancelled:'已取消'}[item.status]||item.status;note.textContent=status+' · '+new Date(item.created).toLocaleString('zh-CN');info.append(name,note);row.append(info);if(item.status==='completed'){const button=document.createElement('button');button.textContent='显示文件';button.onclick=()=>window.classdrop.showDownload(item.id);row.append(button);}list.append(row);}
}
for(const button of document.querySelectorAll('[data-command]'))button.addEventListener('click',()=>window.classdrop.command(button.dataset.command));
$('service-form').addEventListener('submit',async event=>{event.preventDefault();$('settings-error').textContent='';try{await window.classdrop.saveService($('service-input').value.trim());}catch(e){$('settings-error').textContent=e.message.replace(/^Error invoking remote method '[^']+': Error: /,'');}});
window.classdrop.onState(render);window.classdrop.getState().then(render);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&current?.modal)window.classdrop.command('close-modal');});
