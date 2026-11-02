import {auth,db,json,handle,fail,sameOrigin,readJson} from '../../../lib/data';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>{const u=await auth();const r=await db().prepare('SELECT t.*, (SELECT MAX(updated) FROM submissions s WHERE s.task_id=t.id AND s.deleted_at IS NULL) AS latest_received FROM tasks t WHERE owner=? ORDER BY created DESC').bind(u.userId).all();return json({tasks:r.results});});}
export async function POST(req:Request){return handle(async()=>{sameOrigin(req);const u=await auth();const b=await readJson(req);
 const title=String(b.title||'').trim(),course=String(b.course||'').trim(),description=String(b.description||'').trim();
 if(!title||title.length>80||course.length>80||description.length>1500)fail('请填写作业名称（最多80字），说明最多1500字');
 const mode=b.mode||'homework';if(!['homework','general','print'].includes(mode))fail('收集类型不正确');
 const expected=mode==='homework'?Number(b.expected||0):0;if(!Number.isInteger(expected)||expected<0||expected>2000)fail('班级人数需为0—2000的整数');
 if(b.deadline&&!Number.isFinite(Date.parse(b.deadline)))fail('截止时间不正确');
 const deadline=b.deadline?new Date(b.deadline).toISOString():'';if(deadline&&Date.parse(deadline)<=Date.now())fail('截止时间需要晚于当前时间');
 const roster=mode==='homework'&&Array.isArray(b.roster)?b.roster:[];if(roster.length>2000)fail('名单最多2000人');
 const ids=new Set();for(const r of roster){if(!r||typeof r.studentId!=='string'||typeof r.name!=='string')fail('名单格式应为：学号 姓名');if(!/^[a-zA-Z0-9_-]{1,32}$/.test(r.studentId)||!String(r.name||'').trim()||r.name.length>40)fail('名单格式应为：学号 姓名');if(ids.has(r.studentId))fail('名单中有重复学号');ids.add(r.studentId);}
 const count=await db().prepare('SELECT COUNT(*) AS n FROM tasks WHERE owner=?').bind(u.userId).first<any>();if(count.n>=100)fail('当前最多可创建100个任务');
 const id=crypto.randomUUID();await db().prepare('INSERT INTO tasks (id,owner,title,course,description,expected,deadline,roster,created,mode) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,u.userId,title,course,description,roster.length||expected,deadline,JSON.stringify(roster),new Date().toISOString(),mode).run();return json({id},201);
});}
