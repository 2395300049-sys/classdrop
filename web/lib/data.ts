import { env } from 'cloudflare:workers';
import { getAccountUser } from './accounts';
export const db = () => { if(!env.DB) throw new Error('数据库未连接'); return env.DB; };
export const bucket = () => { if(!env.BUCKET) throw new Error('文件存储未连接'); return env.BUCKET; };
export function json(data: unknown, status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function fail(message: string,status=400): never {throw Object.assign(new Error(message),{status});}
export async function auth(){const u=await getAccountUser();if(!u)fail('请先登录管理账号',401);return u!;}
export async function task(id:string){const t=await db().prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<any>();if(!t)fail('收集任务不存在',404);return t;}
export async function owned(id:string){const u=await auth(),t=await task(id);if(t.owner!==u.userId)fail('没有权限查看此任务',403);return t;}
export async function handle(fn:()=>Promise<Response>){try{return await fn();}catch(e:any){console.error(e?.status?'Request rejected':e);return json({error:e?.status?e.message:'服务暂时不可用，请稍后重试'},e?.status||500);}}
export async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export function safe(s:string){return s.replace(/[\\/<>:"|?*\x00-\x1f]/g,'_').replace(/^\.+/,'_').slice(0,120)||'file';}
export function sameOrigin(req:Request){const o=req.headers.get('origin');if(o && o!==new URL(req.url).origin)fail('请求来源不正确',403);}
export type StoredFile={key:string;name:string;size:number;type:string};
export async function readJson(req:Request){
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))fail('请求格式应为JSON',415);
 if(!req.body)fail('请求内容为空');const reader=req.body.getReader();const decoder=new TextDecoder();let text='',bytes=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>512*1024){await reader.cancel();fail('请求内容过大',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();let data;try{data=JSON.parse(text);}catch{fail('请求内容不是有效JSON');}if(!data||typeof data!=='object'||Array.isArray(data))fail('请求内容应为一个对象');return data;}finally{reader.releaseLock();}
}
