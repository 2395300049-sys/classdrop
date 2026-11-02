"""Local integration test against a running Sites dev server (never production)."""
import urllib.request, urllib.error, http.cookiejar, json, io, zipfile, secrets, uuid
base='http://localhost:5173'
jar=http.cookiejar.CookieJar()
admin=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
test_username='test_'+uuid.uuid4().hex[:16]
test_password=secrets.token_urlsafe(24)
registration=urllib.request.Request(base+'/api/account/register',data=json.dumps({'username':test_username,'password':test_password,'displayName':'Local test'}).encode(),headers={'Content-Type':'application/json'})
with admin.open(registration) as response:
    assert response.status==201
    registration_data=json.load(response)
def req(path,data=None,method=None,authorized=True,headers=None):
    r=urllib.request.Request(base+path,data=data,method=method,headers=headers or {})
    try:
        with (admin if authorized else urllib.request.build_opener()).open(r) as x: return x.status,x.read()
    except urllib.error.HTTPError as x: return x.code,x.read()
s,b=req('/api/tasks',json.dumps({'title':'集成验证任务','course':'本地测试','expected':2,'roster':[{'studentId':'TEST001','name':'测试同学'},{'studentId':'TEST002','name':'待交同学'}]}).encode(),headers={'Content-Type':'application/json'})
assert s==201,(s,b)
id=json.loads(b)['id']
assert req('/api/tasks/'+id,authorized=False)[0]==401
assert req('/api/submit/'+id,authorized=False)[0]==200
boundary='test-boundary-classdrop'
def upload(receipt='',student='TEST001',name='测试同学',content=b'Homework original bytes\x00\xff'):
    parts=[]
    for k,v in [('studentId',student),('name',name),('receipt',receipt)]:
        parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+v+'\r\n').encode())
    parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="files"; filename="homework.txt"\r\nContent-Type: text/plain\r\n\r\n').encode()+content+b'\r\n')
    parts.append(('--'+boundary+'--\r\n').encode())
    return req('/api/submit/'+id,b''.join(parts),'POST',False,{'Content-Type':'multipart/form-data; boundary='+boundary})
assert upload(student='OTHER')[0]==400
s,b=upload();assert s==200,(s,b)
receipt=json.loads(b)['receipt']
assert upload()[0]==409
s,b=upload(receipt,content=b'Updated homework bytes\x00\xff');assert s==200,(s,b)
s,b=req('/api/tasks/'+id);d=json.loads(b);assert len(d['submissions'])==1
sid=d['submissions'][0]['id']
s,b=req('/api/files/'+sid);assert b==b'Updated homework bytes\x00\xff',(s,b)
assert req('/api/files/'+sid,authorized=False)[0]==401
assert req('/api/tasks/'+id+'/zip',authorized=False)[0]==401
s,b=req('/api/tasks/'+id+'/zip');assert s==200,(s,b)
z=zipfile.ZipFile(io.BytesIO(b));assert z.testzip() is None
assert z.read(next(n for n in z.namelist() if n!='收件记录.csv'))==b'Updated homework bytes\x00\xff'
assert req('/api/tasks/'+id,json.dumps({'closed':True}).encode(),'PATCH',True,{'Content-Type':'application/json'})[0]==200
assert upload(receipt)[0]==409
assert req('/api/tasks/'+id,json.dumps({'closed':False}).encode(),'PATCH',True,{'Content-Type':'application/json'})[0]==200
assert upload(receipt)[0]==200
print('PASS: create; anonymous upload; roster validation; auth isolation; replacement receipt; exact download; valid ZIP CRC/content; pause and resume.')
print('Local test task: '+id)
# General collection: same display name must create independent batches without a student ID.
def create_mode(mode):
    code,body=req('/api/tasks',json.dumps({'title':'验证-'+mode,'mode':mode}).encode(),headers={'Content-Type':'application/json'})
    assert code==201,(code,body)
    return json.loads(body)['id']
def generic_upload(task_id,receipt='',key='',options=None,content=b'General file bytes\x00\xfe'):
    values=[('name','同名顾客'),('contact','尾号1234'),('note','左上角装订'),('receipt',receipt)]
    if key:values.append(('studentId',key))
    if options is not None:values.append(('printOptions',json.dumps(options)))
    parts=[]
    for k,v in values:parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+v+'\r\n').encode())
    parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="files"; filename="document.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()+content+b'\r\n')
    parts.append(('--'+boundary+'--\r\n').encode())
    return req('/api/submit/'+task_id,b''.join(parts),'POST',False,{'Content-Type':'multipart/form-data; boundary='+boundary})
general=create_mode('general')
s,b=generic_upload(general);assert s==200,(s,b);one=json.loads(b)
s,b=generic_upload(general);assert s==200,(s,b);two=json.loads(b)
assert one['studentId']!=two['studentId']
s,b=req('/api/tasks/'+general);gd=json.loads(b)
assert len(gd['submissions'])==2 and gd['task']['mode']=='general' and gd['task']['expected']==0
assert all(x['contact']=='尾号1234' and x['note']=='左上角装订' for x in gd['submissions'])
assert generic_upload(general,key=one['studentId'])[0]==409
assert generic_upload(general,key=one['studentId'],receipt=one['receipt'])[0]==200
printing=create_mode('print')
options={'paper':'A4','color':'bw','sides':'double','copies':3,'pages':'1-5,8'}
assert generic_upload(printing,options={**options,'copies':0})[0]==400
s,b=generic_upload(printing,options=options);assert s==200,(s,b)
pone=json.loads(b)
s,b=req('/api/tasks/'+printing);pd=json.loads(b);ps=pd['submissions'][0]
assert ps['print_options']==options and ps['status']=='new'
patch=json.dumps({'status':'done'}).encode()
assert req('/api/submissions/'+ps['id'],patch,'PATCH',False,{'Content-Type':'application/json'})[0]==401
assert req('/api/submissions/'+ps['id'],patch,'PATCH',True,{'Content-Type':'application/json'})[0]==200
s,b=req('/api/tasks/'+printing);assert json.loads(b)['submissions'][0]['status']=='done'
s,b=req('/api/submit/'+printing,authorized=False)
assert 'contact' not in json.loads(b) and 'roster' not in json.loads(b)
s,b=req('/api/tasks/'+general+'/zip');assert s==200
z=zipfile.ZipFile(io.BytesIO(b));assert z.testzip() is None
assert len(z.namelist())==3 and len(set(z.namelist()))==3
assert '收件记录.csv' in z.namelist()
assert all(z.read(n)==b'General file bytes\x00\xfe' for n in z.namelist() if n!='收件记录.csv')
print('PASS: general upload without student ID; same-name independent batches; receipt protection; print validation and persistence; processing status authorization; private contact isolation; separate ZIP folders.')
print('Local print task: '+printing)
