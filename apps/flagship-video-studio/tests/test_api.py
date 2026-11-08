import os
import tempfile
from pathlib import Path

# Configure before importing the persistent database module.
_tmp=tempfile.TemporaryDirectory(prefix='flagship-tests-')
os.environ['STUDIO_DATA_DIR']=_tmp.name
os.environ['STUDIO_REQUIRE_AUTH']='0'

from fastapi.testclient import TestClient
from app.main import app
from app import db


def test_health_projects_storyboard():
    with TestClient(app) as c:
        r=c.get('/api/health');assert r.status_code==200
        p=c.post('/api/projects',json={'name':'Demo Film','client':'Test Corp','format':'landscape'}).json()
        assert p['name']=='Demo Film'
        sid=c.post(f"/api/projects/{p['id']}/shots",json={'kind':'title','headline':'First scene','duration':2}).json()['shots'][0]['id']
        m=c.get(f"/api/projects/{p['id']}/storyboard.md")
        assert m.status_code==200 and 'First scene' in m.text
        bad=c.post(f"/api/projects/{p['id']}/shots",json={'kind':'photo','duration':2})
        assert bad.status_code==422
        assert c.delete(f"/api/projects/{p['id']}/shots/{sid}").status_code==200


def test_demo_render_and_outputs():
    with TestClient(app) as c:
        p=c.post('/api/demo').json()
        assert len(p['shots'])==3
        assert p['duration']==11.5
        r=c.post(f"/api/projects/{p['id']}/render")
        assert r.status_code==202
        import time
        jobid=r.json()['id']
        for _ in range(150):
            j=c.get(f'/api/jobs/{jobid}').json()
            if j['status'] in ['completed','failed']:break
            time.sleep(.15)
        assert j['status']=='completed',j.get('error')
        f=c.get(f'/api/jobs/{jobid}/download')
        assert f.status_code==200 and f.content[:4]!=b''
        assert len(f.content)>10000
        assert c.get(f"/api/projects/{p['id']}/seo.json").json()['review_required'] is True
        import io,zipfile
        z=zipfile.ZipFile(io.BytesIO(c.get(f"/api/projects/{p['id']}/bundle.zip").content))
        assert 'project/manifest.json' in z.namelist()
        assert 'delivery/latest-master.mp4' in z.namelist()


def test_integrations_and_srt():
    with TestClient(app) as c:
        s=c.get('/api/integrations').json()
        assert len(s)==10
        assert any(x['name']=='OpenCut' for x in s)
        p=c.post('/api/projects',json={'name':'Subtitles','script':'Hello this is a test.'}).json()
        c.post(f"/api/projects/{p['id']}/shots",json={'kind':'title','duration':4,'headline':'Hello'})
        assert '-->' in c.get(f"/api/projects/{p['id']}/captions/estimated.srt").text
        assert c.post(f"/api/projects/{p['id']}/captions",json={'srt':'hello'}).status_code==422


def test_authentication_required():
    from app.main import auth
    from fastapi import HTTPException
    os.environ['STUDIO_REQUIRE_AUTH']='1'
    os.environ['STUDIO_USERNAME']='user'
    os.environ['STUDIO_PASSWORD']='a-secret'
    with TestClient(app) as c:
        assert c.get('/api/projects').status_code==401
        assert c.get('/api/projects',auth=('user','a-secret')).status_code==200
    os.environ['STUDIO_REQUIRE_AUTH']='0'
    os.environ.pop('STUDIO_USERNAME')
    os.environ.pop('STUDIO_PASSWORD')


def test_planner_clients_bookings_seo():
    with TestClient(app) as c:
        p=c.post('/api/projects',json={'name':'Client Case Study'}).json()
        t=c.post('/api/tasks',json={'title':'Get signed client approval','project_id':p['id'],'priority':'high'}).json()
        assert t['status']=='todo'
        assert c.patch('/api/tasks/'+t['id'],json={'status':'review'}).json()['status']=='review'
        client=c.post('/api/clients',json={'name':'Case Study Client','email':'client@example.com'}).json()
        booking=c.post('/api/bookings',json={'client_id':client['id'],'project_id':p['id'],
          'starts_at':'2026-11-12T10:00:00-04:00','purpose':'Storyboard review'}).json()
        assert booking['client_id']==client['id']
        saved=c.put('/api/seo/'+p['id'],json={'page_title':'Video Storyboard Review',
          'primary_keyword':'video storyboard','keywords':'video,storyboard'}).json()
        assert saved['primary_keyword']=='video storyboard'
        seo=c.get('/api/projects/'+p['id']+'/seo.json').json()
        assert seo['title']=='Video Storyboard Review'
        assert seo['keywords']==['video','storyboard']


def test_image_asset_upload_and_photo_scene():
    from PIL import Image
    import io
    with TestClient(app) as c:
        image=Image.new('RGB',(150,100),(30,100,90)); buf=io.BytesIO();image.save(buf,format='PNG')
        a=c.post('/api/assets',files={'file':('photo.png',buf.getvalue(),'image/png')})
        assert a.status_code==201,a.text
        aid=a.json()['id']
        p=c.post('/api/projects',json={'name':'Photo Scene'}).json()
        r=c.post('/api/projects/'+p['id']+'/shots',json={'kind':'photo','asset_id':aid,
            'headline':'Community progress','subtitle':'Approved source image','duration':2})
        assert r.status_code==201,r.text
        assert c.get('/api/assets/'+aid+'/file').status_code==200
        assert c.post('/api/assets',files={'file':('bad.txt',b'invalid','text/plain')}).status_code==415


def test_4k_format_is_available_without_running_expensive_render():
    with TestClient(app) as c:
        p=c.post('/api/projects',json={'name':'UHD Film','format':'cinema-4k'})
        assert p.status_code==201
        assert p.json()['format']=='cinema-4k'
