'use strict';
const DEFAULT_SERVICE='https://classdrop-homework-20261102.astral-sky-1170.chatgpt.site';

const EXTERNAL_HOSTS=new Set(['github.com','kf.qq.com','urlsec.qq.com','www.electronjs.org','docs.github.com']);
function serviceOrigin(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('请填写完整的 HTTPS 服务地址，不包含路径、账号或参数。');return u.origin;
}
function classify(value,origin){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return 'blocked';if(u.origin===origin)return 'service';if(EXTERNAL_HOSTS.has(u.hostname)&&(!u.port||u.port==='443'))return 'external';return 'blocked';}catch{return 'blocked';}}
function safeFilename(value){
 let name=String(value||'download').replace(/[\\/<>:"|?*\x00-\x1f]/g,'_').replace(/^\.+/,'_').replace(/[. ]+$/,'').slice(0,180)||'download';
 if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='_'+name;return name;
}
module.exports={DEFAULT_SERVICE,serviceOrigin,classify,safeFilename};
