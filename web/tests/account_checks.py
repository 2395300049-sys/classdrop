"""Local-only account/session/isolation checks. Does not print credentials."""
import urllib.request,urllib.error,http.cookiejar,json,secrets,uuid
base='http://localhost:5173'
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(c,action,data=None,method=None,headers=None):
    body=json.dumps(data).encode() if data is not None else None
    r=urllib.request.Request(base+action,data=body,method=method,headers={'Content-Type':'application/json',**(headers or {})})
    try:
        with c.open(r) as response:return response.status,json.loads(response.read()),response.headers
    except urllib.error.HTTPError as response:
        raw=response.read()
        try:data=json.loads(raw)
        except ValueError:data={'error':'non-JSON rejection'}
        return response.code,data,response.headers
alice,bob,anon=client(),client(),client()
name='auth_'+uuid.uuid4().hex[:16];password=secrets.token_urlsafe(24)
status,d,h=call(alice,'/api/account/register',{'username':name,'password':password,'displayName':'Account test'})
assert status==201,(status,d)
recovery=d['recoveryKey'];assert len(recovery)==48
cookie=h.get('Set-Cookie');assert 'HttpOnly' in cookie and 'SameSite=Lax' in cookie
assert call(alice,'/api/account/me')[1]['user']['username']==name
assert call(anon,'/api/tasks')[0]==401
assert call(anon,'/api/tasks',headers={'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@test.invalid'})[0]==401
status,t,_=call(alice,'/api/tasks',{'title':'Account isolation test','mode':'general'});assert status==201
other='auth_'+uuid.uuid4().hex[:16]
assert call(bob,'/api/account/register',{'username':other,'password':secrets.token_urlsafe(24)})[0]==201
assert call(bob,'/api/tasks/'+t['id'])[0]==403
assert call(bob,'/api/tasks')[1]['tasks']==[]
assert call(anon,'/api/account/login',{'username':name,'password':'wrong-password'})[0]==401
assert call(anon,'/api/account/login',{'username':name,'password':password},headers={'Origin':'https://evil.invalid'})[0]==403
assert call(alice,'/api/account/logout',{},'POST')[0]==200
assert call(alice,'/api/tasks')[0]==401
assert call(alice,'/api/account/login',{'username':name,'password':password})[0]==200
second=client();assert call(second,'/api/account/login',{'username':name,'password':password})[0]==200
new_password=secrets.token_urlsafe(24)
assert call(anon,'/api/account/recover',{'username':name,'recoveryKey':'bad','newPassword':new_password})[0]==401
status,d,_=call(anon,'/api/account/recover',{'username':name,'recoveryKey':recovery,'newPassword':new_password});assert status==200,(status,d)
assert d['recoveryKey']!=recovery
assert call(alice,'/api/tasks')[0]==401 and call(second,'/api/tasks')[0]==401
assert call(alice,'/api/account/login',{'username':name,'password':password})[0]==401
assert call(alice,'/api/account/login',{'username':name,'password':new_password})[0]==200
assert call(alice,'/api/tasks/'+t['id'])[0]==200
changed_password=secrets.token_urlsafe(24)
status,d,_=call(alice,'/api/account/change-password',{'oldPassword':new_password,'newPassword':changed_password});assert status==200,(status,d)
assert call(alice,'/api/tasks')[0]==200
assert call(anon,'/api/tasks')[0]==401
assert call(anon,'/api/account/login',{'username':name,'password':changed_password})[0]==200
for i in range(13):last=call(client(),'/api/account/login',{'username':'absent_'+name,'password':'wrong'})[0]
assert last==429,last
assert call(client(),'/api/account/register',{'username':'weakname','password':'short'})[0]==400
assert call(client(),'/api/account/register',{'username':name,'password':secrets.token_urlsafe(24)})[0]==409
html=urllib.request.urlopen(base+'/account').read().decode();assert '用户名和密码' in html and 'signin-with-chatgpt' not in html
print('PASS: standalone registration/login; HttpOnly session; logout revocation; own-task isolation; external identity headers ignored; cross-origin rejection; recovery-key rotation; password change and global session revocation; login throttling; no third-party login link.')
