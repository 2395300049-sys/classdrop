import {db,fail} from './data';
import {dateTime,dayKey,expired} from './dates';
export async function listSubmissions(taskId:string,url?:URL){
 const args:any[]=[taskId];let where='task_id=?';
 if(url){
  where+=url.searchParams.get('trash')==='1'?' AND deleted_at IS NOT NULL':' AND deleted_at IS NULL';
  const from=url.searchParams.get('from'),to=url.searchParams.get('to');
  for(const d of [from,to])if(d&&(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d+'T00:00:00+08:00'))))fail('日期格式不正确');
  if(from&&to&&from>to)fail('开始日期不能晚于结束日期');
  if(from){where+=' AND COALESCE(received_at,updated)>=?';args.push(new Date(from+'T00:00:00+08:00').toISOString());}
  if(to){where+=' AND COALESCE(received_at,updated)<?';args.push(new Date(Date.parse(to+'T00:00:00+08:00')+86400000).toISOString());}
  const q=url.searchParams.get('q')?.trim().toLowerCase();if(q){if(q.length>120)fail('搜索内容过长');where+=" AND (instr(lower(name),?)>0 OR instr(lower(student_id),?)>0 OR instr(lower(files),?)>0 OR instr(lower(note),?)>0 OR instr(lower(contact),?)>0)";args.push(q,q,q,q,q);}
  const status=url.searchParams.get('status');if(status&&status!=='all'){if(!['new','processing','done','expired'].includes(status))fail('状态不正确');if(status==='expired'){where+=' AND (purged_at IS NOT NULL OR expires_at<=?)';args.push(new Date().toISOString());}else{where+=' AND status=? AND (expires_at IS NULL OR expires_at>?) AND purged_at IS NULL';args.push(status,new Date().toISOString());}}
 }
 const r=await db().prepare('SELECT * FROM submissions WHERE '+where+' ORDER BY COALESCE(received_at,updated) DESC,id DESC LIMIT 2000').bind(...args).all<any>();return r.results;
}
export function csvCell(v:unknown){return '"'+String(v??'').replace(/^[\s]*[=+@\-]/,"'$&").replaceAll('"','""')+'"';}
export function recordCSV(rows:any[],homework=false){
 const header=[homework?'学号':'收件号','称呼','首次收件时间（北京时间）','最近更新时间（北京时间）','文件到期时间（北京时间）','文件名','联系方式','备注','打印要求','处理状态'];
 const data=rows.map(s=>{const p=JSON.parse(s.print_options||'{}');const print=p.paper?`${p.paper} / ${p.color==='color'?'彩色':'黑白'} / ${p.sides==='double'?'双面':'单面'} / ${p.copies}份 / ${p.pages||'全部页码'}`:'';return [homework?s.student_id:s.student_id.slice(-8).toUpperCase(),s.name,s.received_at?dateTime(s.received_at):'历史记录未单独保存',dateTime(s.updated),s.expires_at?dateTime(s.expires_at):'已有文件保留',JSON.parse(s.files).map((f:any)=>f.name).join('；'),s.contact,s.note,print,expired(s)?'已过期':s.deleted_at?'回收站':({new:'待处理',processing:'处理中',done:'已完成'} as any)[s.status]||s.status];});
 return '\uFEFF'+[header,...data].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
