import {owned,bucket,handle,fail,safe,StoredFile} from '../../../../../lib/data';
import {zip,zipStream} from '../../../../../lib/zip';
import {listSubmissions,recordCSV} from '../../../../../lib/submissions';
import {dayKey,expired} from '../../../../../lib/dates';
export const dynamic='force-dynamic';
export async function GET(req:Request,ctx:any){return handle(async()=>{
 const {id}=await ctx.params;const t=await owned(id);const rows=(await listSubmissions(id,new URL(req.url))).filter(s=>!s.deleted_at&&!expired(s));
 if(!rows.length)fail('当前筛选下没有可下载的文件');
 const total=rows.reduce((sum,s)=>sum+JSON.parse(s.files).reduce((n:number,f:StoredFile)=>n+f.size,0),0);if(total>3500*1024*1024)fail('文件超过3.5GB，请按日期分批下载');
 async function* entries(){
  yield {name:'收件记录.csv',body:new Blob([recordCSV(rows,t.mode==='homework')]).stream()};
  for(const s of rows){const files:StoredFile[]=JSON.parse(s.files);for(let i=0;i<files.length;i++){const f=files[i],o=await bucket().get(f.key);if(!o)throw new Error('文件读取失败，请重试');yield{name:`${dayKey(s.received_at||s.updated)}/${safe((t.mode==='homework'?s.student_id:s.student_id.slice(-8))+'_'+s.name)}/${i+1}_${safe(f.name)}`,body:o.body};}}
 }
 return new Response(zipStream(zip(entries())),{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safe(t.title)+'.zip')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
});}
