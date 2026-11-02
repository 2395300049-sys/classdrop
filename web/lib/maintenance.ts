export async function expireFiles(database:D1Database,bucket:R2Bucket){
 const now=new Date().toISOString();let removed=0,failed=0;
 const rows=await database.prepare('SELECT id,files,expires_at FROM submissions WHERE expires_at IS NOT NULL AND expires_at<=? AND purged_at IS NULL LIMIT 100').bind(now).all<any>();
 for(const row of rows.results){try{
  const files=JSON.parse(row.files);for(const f of files)await bucket.delete(f.key);
  const r=await database.prepare("UPDATE submissions SET files='[]',purged_at=?,status='expired' WHERE id=? AND expires_at=? AND files=? AND purged_at IS NULL").bind(now,row.id,row.expires_at,row.files).run();removed+=r.meta.changes||0;
 }catch{failed++;}}
 // Clean objects from interrupted uploads as well as their expired reservation.
 const abandoned=await database.prepare('SELECT id,task_id FROM upload_reservations WHERE created<? LIMIT 100').bind(new Date(Date.now()-600000).toISOString()).all<any>();
 for(const r of abandoned.results){try{const objects=await bucket.list({prefix:r.task_id+'/'+r.id+'/'});for(const o of objects.objects)await bucket.delete(o.key);await database.prepare('DELETE FROM upload_reservations WHERE id=?').bind(r.id).run();}catch{failed++;}}
 await database.prepare('DELETE FROM account_sessions WHERE expires<=?').bind(now).run();
 await database.prepare('DELETE FROM auth_attempts WHERE expires<=?').bind(now).run();
 return {removed,failed,hasMore:rows.results.length===100};
}
