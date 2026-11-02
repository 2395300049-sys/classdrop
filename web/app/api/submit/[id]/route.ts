import {task,db,bucket,json,handle,fail,digest,safe,sameOrigin,StoredFile} from '../../../../lib/data';
import {readUpload,reserve} from '../../../../lib/uploads';
export const dynamic='force-dynamic';
export async function GET(_:Request,ctx:any){return handle(async()=>{const {id}=await ctx.params;const t=await task(id);return json({id:t.id,title:t.title,course:t.course,description:t.description,deadline:t.deadline,closed:!!t.closed,rosterRequired:JSON.parse(t.roster).length>0,mode:t.mode,retentionDays:30});});}
export async function POST(req:Request,ctx:any){return handle(async()=>{
 sameOrigin(req);const {id}=await ctx.params;let t=await task(id);const homework=t.mode==='homework';
 const check=()=>{if(t.closed||t.deadline&&Date.parse(t.deadline)<Date.now())fail('本次收集已截止，暂时无法提交',409);};check();
 const form=await readUpload(req),name=String(form.get('name')||'').trim();
 const studentId=homework?String(form.get('studentId')||'').trim():(String(form.get('studentId')||'')||'F'+crypto.randomUUID().replaceAll('-','').slice(0,24));
 if(!name||name.length>40)fail(homework?'请填写姓名':'请填写称呼（最多40字）');
 if(homework&&!/^[a-zA-Z0-9_-]{1,32}$/.test(studentId))fail('请填写有效学号');
 if(!homework&&!/^F[a-f0-9]{24}$/.test(studentId))fail('收件编号格式不正确，请重新打开页面');
 const contact=String(form.get('contact')||'').trim(),note=String(form.get('note')||'').trim();if(contact.length>80||note.length>1000)fail('联系方式最多80字，备注最多1000字');
 const roster=JSON.parse(t.roster);if(homework&&roster.length&&!roster.some((r:any)=>r.studentId===studentId&&r.name===name))fail('姓名或学号与班级名单不一致，请核对');
 let printOptions:any={};if(t.mode==='print'){
  try{printOptions=JSON.parse(String(form.get('printOptions')||'{}'));}catch{fail('打印选项格式不正确');}
  if(!printOptions||!['A4','A3'].includes(printOptions.paper)||!['bw','color'].includes(printOptions.color)||!['single','double'].includes(printOptions.sides)||!Number.isInteger(printOptions.copies)||printOptions.copies<1||printOptions.copies>999||typeof printOptions.pages!=='string'||printOptions.pages.length>80)fail('请正确填写纸张、颜色、单双面、份数和页码');
  printOptions={paper:printOptions.paper,color:printOptions.color,sides:printOptions.sides,copies:printOptions.copies,pages:printOptions.pages};
 }
 const files=form.getAll('files').filter((v):v is File=>typeof v!=='string');if(!files.length||files.length>5||files.some(f=>!f.size||f.size>20*1024*1024)||files.reduce((s,f)=>s+f.size,0)>50*1024*1024)fail('请上传1—5个非空文件，单个最多20MB、合计最多50MB');
 const old=await db().prepare('SELECT * FROM submissions WHERE task_id=? AND student_id=?').bind(id,studentId).first<any>();
 if(old?.deleted_at)fail('这份收件已被收件人移入回收站，请联系收件人恢复',409);
 const submittedReceipt=String(form.get('receipt')||'');if(old&&(!submittedReceipt||await digest(submittedReceipt)!==old.receipt_hash))fail(homework?'该学号已提交。请在原浏览器重新提交，或联系收件人处理。':'不能替换此收件记录，请使用原浏览器的凭证。',409);
 const count=await db().prepare('SELECT COUNT(*) AS n FROM submissions WHERE task_id=?').bind(id).first<any>();if(!old&&count.n>=2000)fail('任务已达到2000份提交上限',409);
 const reservation=await reserve(id,t.owner,files.reduce((n,f)=>n+f.size,0));
 const now=new Date().toISOString(),expiresAt=new Date(Date.now()+30*86400000).toISOString();
 const receipt=old?submittedReceipt:(/^[a-f0-9-]{72}$/.test(submittedReceipt)?submittedReceipt:crypto.randomUUID()+crypto.randomUUID());const stored:StoredFile[]=[];
 try{
  for(const [index,file] of files.entries()){const key=`${id}/${reservation}/${index}_${safe(file.name)}`;await bucket().put(key,file.stream(),{httpMetadata:{contentType:'application/octet-stream'}});stored.push({key,name:safe(file.name),size:file.size,type:file.type});}
  t=await task(id);check();
  if(old){const res=await db().prepare("UPDATE submissions SET name=?, files=?, updated=?, contact=?, note=?, print_options=?, status='new',expires_at=?,purged_at=NULL WHERE id=? AND files=? AND deleted_at IS NULL").bind(name,JSON.stringify(stored),now,contact,note,JSON.stringify(printOptions),expiresAt,old.id,old.files).run();if(!res.meta.changes)fail('发生同时提交，请刷新后重试',409);}
  else{await db().prepare('INSERT INTO submissions (id,task_id,student_id,name,receipt_hash,files,updated,contact,note,print_options,received_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,studentId,name,await digest(receipt),JSON.stringify(stored),now,contact,note,JSON.stringify(printOptions),now,expiresAt).run();}
 }catch(e){await Promise.allSettled(stored.map(f=>bucket().delete(f.key)));throw e;}finally{await db().prepare('DELETE FROM upload_reservations WHERE id=?').bind(reservation).run();}
 if(old){await Promise.allSettled(JSON.parse(old.files).map((f:StoredFile)=>bucket().delete(f.key)));}
 return json({ok:true,receipt,studentId,contact,note,printOptions,updated:now,receivedAt:old?.received_at||(!old?now:null),expiresAt,files:stored.map(f=>({name:f.name,size:f.size}))});
});}
