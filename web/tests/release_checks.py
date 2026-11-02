"""Local release checks: retention, recovery, quotas and concurrent upload integrity."""
import runpy,datetime,subprocess,shutil,json,uuid,time,urllib.parse,concurrent.futures
s=runpy.run_path('tests/smoke.py')
req,create,upload=s['req'],s['create_mode'],s['generic_upload']
def sql(command):
    r=subprocess.run([shutil.which('node'),'--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],capture_output=True,text=True)
    assert r.returncode==0,r.stderr

def detail(t):
    code,b=req('/api/tasks/'+t);assert code==200,(code,b);return json.loads(b)
t=create('general')
code,b=upload(t);assert code==200,(code,b);first=json.loads(b);record=detail(t)['submissions'][0];rid=record['id']
parse=lambda v:datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
assert abs((parse(first['expiresAt'])-parse(first['receivedAt'])).total_seconds()-30*86400)<1
code,b=upload(t,key=first['studentId'],receipt=first['receipt'],content=b'replaced');assert code==200,(code,b)
second=json.loads(b)
assert second['receivedAt']==first['receivedAt'] and parse(second['expiresAt'])>=parse(first['expiresAt'])
assert 'receipt_hash' not in detail(t)['submissions'][0]
assert 'key' not in detail(t)['submissions'][0]['files'][0]
def patch(body,authorized=True):return req('/api/submissions/'+rid,json.dumps(body).encode(),'PATCH',authorized,{'Content-Type':'application/json'})
assert patch({'action':'trash'},False)[0]==401
assert patch({'action':'trash'})[0]==200
assert req('/api/files/'+rid)[0]==404
assert upload(t,key=first['studentId'],receipt=first['receipt'])[0]==409
assert patch({'action':'restore'})[0]==200
assert req('/api/files/'+rid)[1]==b'replaced'
code,b=req('/api/tasks/'+t+'/csv');assert code==200
csv=b.decode('utf-8-sig');assert '首次收件时间' in csv and '文件到期时间' in csv and '2026-' in csv
assert req('/api/tasks/'+t+'/csv?from=2099-01-01')[1].decode('utf-8-sig').count('\r\n')==0
assert req('/api/tasks/'+t+'/zip?from=2099-01-01')[0]==400
assert req('/api/tasks/'+t+'/csv?from=invalid')[0]==400
sql("UPDATE submissions SET expires_at='2000-01-01T00:00:00.000Z' WHERE id='"+rid+"'")
assert req('/api/files/'+rid)[0]==410
assert patch({'action':'restore'})[0]==410
code,b=req('/api/maintenance/expire',b'','POST',False)
assert code==200,(code,b)
record=detail(t)['submissions'][0]
assert record['purged_at'] and record['expired'] and record['files']==[]
assert req('/api/files/'+rid)[0]==410
# An ordinary caller cannot select a future date or a target for maintenance.
alive=create('general');code,b=upload(alive);assert code==200
live_id=detail(alive)['submissions'][0]['id']
assert req('/api/maintenance/expire',json.dumps({'date':'9999-01-01','id':live_id}).encode(),'POST',False,{'Content-Type':'application/json'})[0]==200
assert req('/api/files/'+live_id)[0]==200
# Capacity reservations must serialize, even when upload requests race.
quota=create('general');fixture='quota-'+str(uuid.uuid4());now=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
sql("INSERT INTO upload_reservations(id,task_id,bytes,created) VALUES('"+fixture+"','"+quota+"',"+str(1024*1024*1024-128)+",'"+now+"')")
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: codes=list(pool.map(lambda _:upload(quota,content=b'x'*64)[0],range(5)))
    assert sorted(codes)==[200,200,413,413,413],codes
    assert len(detail(quota)['submissions'])==2
finally:sql("DELETE FROM upload_reservations WHERE id='"+fixture+"'")
# Small local load exercise; this is not a production capacity or SLA claim.
load=create('general');start=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    results=list(pool.map(lambda i:upload(load,content=('concurrent-'+str(i)).encode()),range(100)))
assert all(code==200 for code,_ in results),[(code,b[:80]) for code,b in results if code!=200]
rows=detail(load)['submissions'];assert len(rows)==100
assert len({row['student_id'] for row in rows})==100
downloaded=set()
for row in rows:
    code,body=req('/api/files/'+row['id']);assert code==200 and body.startswith(b'concurrent-');downloaded.add(body)
assert downloaded=={('concurrent-'+str(i)).encode() for i in range(100)}
assert req('/api/tasks',b'{bad','POST',True,{'Content-Type':'application/json'})[0]==400
assert req('/api/tasks',b'null','POST',True,{'Content-Type':'application/json'})[0]==400
print('PASS: 30-day expiry; immutable first-received date; trash/restore; immediate expiry download block; physical cleanup; future-file protection; date filters; CSV timestamps; concurrent quota enforcement.')
print('PASS: 100 local submissions at concurrency 10, unique receipts and exact downloads, %.2f seconds.'%(time.monotonic()-start))
print('Local inbox for browser QA: '+load)
