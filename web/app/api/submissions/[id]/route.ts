import {db,owned,json,handle,fail,sameOrigin,readJson} from '../../../../lib/data';
import {expired} from '../../../../lib/dates';
export const dynamic='force-dynamic';
export async function PATCH(req:Request,ctx:any){return handle(async()=>{
 sameOrigin(req);const {id}=await ctx.params;const s=await db().prepare('SELECT * FROM submissions WHERE id=?').bind(id).first<any>();if(!s)fail('收件记录不存在',404);const t=await owned(s.task_id);const b=await readJson(req);
 if(b.action==='trash'){await db().prepare('UPDATE submissions SET deleted_at=? WHERE id=?').bind(new Date().toISOString(),id).run();return json({ok:true});}
 if(b.action==='restore'){if(expired(s))fail('文件已到期，无法恢复下载',410);await db().prepare('UPDATE submissions SET deleted_at=NULL WHERE id=?').bind(id).run();return json({ok:true});}
 if(t.mode==='homework')fail('作业收集不需要处理状态');
 if(!['new','processing','done'].includes(b.status))fail('处理状态不正确');if(expired(s)||s.deleted_at)fail('此收件当前不能修改状态',409);
 await db().prepare('UPDATE submissions SET status=? WHERE id=?').bind(b.status,id).run();return json({ok:true});
});}
