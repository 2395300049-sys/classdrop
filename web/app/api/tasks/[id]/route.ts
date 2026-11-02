import {owned,db,json,handle,sameOrigin,fail,readJson} from '../../../../lib/data';
import {listSubmissions} from '../../../../lib/submissions';
import {expired} from '../../../../lib/dates';
export const dynamic='force-dynamic';
export async function GET(_:Request,ctx:any){return handle(async()=>{
 const {id}=await ctx.params;const t=await owned(id);const rows=await listSubmissions(id);
 const usage=rows.reduce((sum,s)=>sum+JSON.parse(s.files).reduce((n:number,f:any)=>n+f.size,0),0);
 return json({task:t,usageBytes:usage,limitBytes:1024*1024*1024,submissions:rows.map((s:any)=>{const {receipt_hash,...r}=s;return {...r,files:JSON.parse(s.files).map(({name,size,type}:any)=>({name,size,type})),print_options:JSON.parse(s.print_options),expired:expired(s)};})});
});}
export async function PATCH(req:Request,ctx:any){return handle(async()=>{
 sameOrigin(req);const {id}=await ctx.params;await owned(id);const b=await readJson(req);
 if(typeof b.closed==='boolean'&&Object.keys(b).length===1){await db().prepare('UPDATE tasks SET closed=? WHERE id=?').bind(b.closed?1:0,id).run();return json({ok:true});}
 const title=String(b.title||'').trim(),course=String(b.course||'').trim(),description=String(b.description||'').trim();
 if(!title||title.length>80||course.length>80||description.length>1500)fail('名称最多80字，说明最多1500字');
 if(b.deadline&&!Number.isFinite(Date.parse(b.deadline)))fail('截止时间不正确');
 const deadline=b.deadline?new Date(b.deadline).toISOString():'';
 await db().prepare('UPDATE tasks SET title=?,course=?,description=?,deadline=? WHERE id=?').bind(title,course,description,deadline,id).run();return json({ok:true});
});}
