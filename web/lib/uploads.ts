import {db,fail} from './data';
export const limits={file:20*1024*1024,batch:50*1024*1024,body:52*1024*1024,task:1024*1024*1024,account:5*1024*1024*1024};
export async function readUpload(req:Request){
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;'))fail('请使用文件上传表单',415);
 if(Number(req.headers.get('content-length')||0)>limits.body)fail('每次提交合计最多50MB',413);
 if(!req.body)fail('没有收到上传内容');let bytes=0,tooLarge=false;
 const stream=req.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,c){bytes+=chunk.byteLength;if(bytes>limits.body){tooLarge=true;throw new Error('upload body too large');}c.enqueue(chunk);}}));
 try{return await new Response(stream,{headers:{'Content-Type':req.headers.get('content-type')!}}).formData();}catch{fail(tooLarge?'每次提交合计最多50MB':'无法读取上传内容，请重新选择文件',tooLarge?413:400);}
}
export async function reserve(taskId:string,owner:string,bytes:number){
 const id=crypto.randomUUID();
 const r=await db().prepare(`INSERT INTO upload_reservations (id,task_id,bytes,created)
 SELECT ?,?,?,? WHERE
 COALESCE((SELECT SUM(CAST(json_extract(j.value,'$.size') AS INTEGER)) FROM submissions s,json_each(s.files) j WHERE s.task_id=?),0)
 + COALESCE((SELECT SUM(bytes) FROM upload_reservations WHERE task_id=?),0)+? <= ?
 AND COALESCE((SELECT SUM(CAST(json_extract(j.value,'$.size') AS INTEGER)) FROM submissions s JOIN tasks t ON t.id=s.task_id,json_each(s.files) j WHERE t.owner=?),0)
 + COALESCE((SELECT SUM(r.bytes) FROM upload_reservations r JOIN tasks t ON t.id=r.task_id WHERE t.owner=?),0)+? <= ?`).bind(id,taskId,bytes,new Date().toISOString(),taskId,taskId,bytes,limits.task,owner,owner,bytes,limits.account).run();
 if(!r.meta.changes)fail('收件空间容量不足，请联系收件人整理文件后重试',413);return id;
}
