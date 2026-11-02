import {owned,handle,safe} from '../../../../../lib/data';
import {listSubmissions,recordCSV} from '../../../../../lib/submissions';
export const dynamic='force-dynamic';
export async function GET(req:Request,ctx:any){return handle(async()=>{const {id}=await ctx.params;const t=await owned(id);const rows=await listSubmissions(id,new URL(req.url));return new Response(recordCSV(rows,t.mode==='homework'),{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safe(t.title)+'_收件记录.csv')}`,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});});}
