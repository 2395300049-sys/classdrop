import {db,json,handle,readJson,sameOrigin,fail} from '../../../../lib/data';
import {getAccountUser,random,sha,passwordHash,equal,newSession,cookie,revokeCurrent,attempt,importLegacy,legacyOwner} from '../../../../lib/accounts';
export const dynamic='force-dynamic';
function username(v:unknown){return String(v||'').trim().toLowerCase();}
function validPassword(p:unknown):p is string{return typeof p==='string'&&p.length>=12&&p.length<=128&&!/^(.)\1+$/.test(p);}
export async function GET(_:Request,ctx:any){return handle(async()=>{const {action}=await ctx.params;if(action!=='me')fail('接口不存在',404);const user=await getAccountUser();let canImport=false;if(user){const owner=await legacyOwner();if(owner){const r=await db().prepare('SELECT COUNT(*) AS n FROM tasks WHERE owner=?').bind(owner).first<any>();canImport=r.n>0;}}return json({user,canImport});});}
export async function POST(req:Request,ctx:any){return handle(async()=>{
 sameOrigin(req);const {action}=await ctx.params;
 if(action==='logout'){await revokeCurrent();const r=json({ok:true});r.headers.set('Set-Cookie',cookie('',req,0));return r;}
 if(action==='import-legacy'){const user=await getAccountUser();if(!user)fail('请先登录',401);return json({ok:true,imported:await importLegacy(user!.userId)});}
 if(!['register','login','recover','change-password'].includes(action))fail('接口不存在',404);
 const b=await readJson(req),name=username(b.username);
 if(action==='register'){
  if(!/^[a-z0-9][a-z0-9_-]{3,31}$/.test(name))fail('用户名需为4—32位字母、数字、下划线或短横线');
  if(!validPassword(b.password))fail('密码需为12—128位，不能全部使用同一个字符');
  const display=String(b.displayName||name).trim();if(!display||display.length>40)fail('称呼最多40字');
  if(!await attempt(req,'register','',10,3600000))fail('注册尝试过于频繁，请稍后重试',429);
  const existing=await db().prepare('SELECT id FROM accounts WHERE username=?').bind(name).first();if(existing)fail('该用户名已被使用',409);
  const id='acct_'+crypto.randomUUID(),salt=random(16),recoveryKey=random(24);const hash=await passwordHash(b.password,salt);
  try{await db().prepare('INSERT INTO accounts(id,username,display_name,password_hash,salt,recovery_hash,created) VALUES(?,?,?,?,?,?,?)').bind(id,name,display,hash,salt,await sha(recoveryKey),new Date().toISOString()).run();}catch(e){if(await db().prepare('SELECT id FROM accounts WHERE username=?').bind(name).first())fail('该用户名已被使用',409);throw e;}
  const imported=await importLegacy(id);const r=json({ok:true,user:{userId:id,username:name,displayName:display},recoveryKey,imported},201);r.headers.set('Set-Cookie',await newSession(id,req));return r;
 }
 if(action==='login'){
  if(!await attempt(req,'login',name,12,900000))fail('登录尝试过于频繁，请15分钟后再试',429);
  if(!await attempt(req,'login-ip','',100,900000))fail('登录请求过于频繁，请稍后重试',429);
  const account=await db().prepare('SELECT * FROM accounts WHERE username=?').bind(name).first<any>();
  const candidate=await passwordHash(typeof b.password==='string'&&b.password.length<=128?b.password:'',account?.salt||'invalid-account-salt');
  if(!account||!equal(candidate,account.password_hash))fail('用户名或密码不正确',401);
  const r=json({ok:true,user:{userId:account.id,username:account.username,displayName:account.display_name}});r.headers.set('Set-Cookie',await newSession(account.id,req));return r;
 }
 let account:any;
 if(action==='change-password'){const user=await getAccountUser();if(!user)fail('请先登录',401);account=await db().prepare('SELECT * FROM accounts WHERE id=?').bind(user!.userId).first<any>();if(!await attempt(req,'password-change',account.username,10,900000))fail('尝试过于频繁，请稍后重试',429);const old=typeof b.oldPassword==='string'&&b.oldPassword.length<=128?b.oldPassword:'';if(!equal(await passwordHash(old,account.salt),account.password_hash))fail('原密码不正确',401);}
 else{if(!await attempt(req,'recover',name,8,900000))fail('恢复尝试过于频繁，请稍后重试',429);account=await db().prepare('SELECT * FROM accounts WHERE username=?').bind(name).first<any>();const key=String(b.recoveryKey||'');if(!account||!equal(await sha(key),account.recovery_hash))fail('用户名或恢复密钥不正确',401);}
 if(!validPassword(b.newPassword))fail('新密码需为12—128位，不能全部使用同一个字符');
 const salt=random(16),recoveryKey=random(24);await db().batch([db().prepare('UPDATE accounts SET password_hash=?,salt=?,recovery_hash=? WHERE id=?').bind(await passwordHash(b.newPassword,salt),salt,await sha(recoveryKey),account.id),db().prepare('DELETE FROM account_sessions WHERE user_id=?').bind(account.id)]);
 const r=json({ok:true,recoveryKey});r.headers.set('Set-Cookie',await newSession(account.id,req));return r;
});}
