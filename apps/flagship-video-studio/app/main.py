"""Full local-first studio API and browser interface."""
import asyncio
import hashlib
import hmac
import json
import mimetypes
import os
import re
import shutil
import zipfile
import subprocess
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel

from . import db
from .integrations import service_status, SERVICES, create_plane_issue, send_chatwoot_message
from .render import render_project, safe_asset, script_captions
from .schemas import ProjectCreate, ProjectUpdate, ShotCreate, PositionUpdate, CaptionUpload, PlaneCreate, ChatwootSend

WEB=Path(__file__).resolve().parent.parent/'web'
MAX_UPLOAD=int(os.getenv('STUDIO_MAX_UPLOAD_MB','250'))*1024*1024
EXTENSIONS={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.mkv':'video/x-matroska','.wav':'audio/wav','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg'}
POOL=None
BASIC=HTTPBasic(auto_error=False)

@asynccontextmanager
async def lifespan(app):
    global POOL
    POOL=ThreadPoolExecutor(max_workers=1,thread_name_prefix='studio-render')
    db.initialize()
    db.execute("UPDATE jobs SET status='failed',error='Studio restarted during render',updated_at=? WHERE status IN ('queued','running')",(db.now(),))
    yield
    POOL.shutdown(wait=True,cancel_futures=False)
    POOL=None

app=FastAPI(title='Flagship Video Studio',version='1.0.0',lifespan=lifespan)

def auth(creds:HTTPBasicCredentials|None=Depends(BASIC)):
    user=os.getenv('STUDIO_USERNAME','')
    password=os.getenv('STUDIO_PASSWORD','')
    enforce=os.getenv('STUDIO_REQUIRE_AUTH','0')=='1'
    if enforce and (not (user and password) or password=='REPLACE_WITH_A_UNIQUE_LONG_PASSWORD'):
        raise HTTPException(503,'Set STUDIO_USERNAME and STUDIO_PASSWORD before exposing the app')
    if user or password:
        if not creds or not (hmac.compare_digest(creds.username,user) and hmac.compare_digest(creds.password,password)):
            raise HTTPException(401,'Authentication required',headers={'WWW-Authenticate':'Basic realm="Flagship Studio"'})
    return True

@app.get('/',response_class=HTMLResponse)
def homepage(_:bool=Depends(auth)):
    return (WEB/'index.html').read_text()

@app.get('/app.css')
def css():
    return Response((WEB/'style.css').read_text(),media_type='text/css')

@app.get('/app.js')
def js():
    return Response((WEB/'app.js').read_text(),media_type='application/javascript')

@app.get('/api/health')
def health(_:bool=Depends(auth)):
    return {'status':'ok','renderer':'ready' if shutil.which('ffmpeg') else 'missing','version':'1.0.0'}

@app.get('/api/stats')
def stats(_:bool=Depends(auth)):
    return db.stats()

@app.get('/api/projects')
def list_projects(_:bool=Depends(auth)):
    return db.rows('SELECT * FROM projects ORDER BY updated_at DESC')

@app.post('/api/projects',status_code=201)
def create_project(p:ProjectCreate,_:bool=Depends(auth)):
    project_id=db.uid();t=db.now()
    db.execute('INSERT INTO projects (id,name,client,description,format,accent,background,script,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      (project_id,p.name,p.client,p.description,p.format,p.accent,p.background,p.script,t,t))
    return get_project(project_id,True)

@app.get('/api/projects/{project_id}')
def get_project(project_id:str,_:bool=Depends(auth)):
    p=db.one('SELECT * FROM projects WHERE id=?',(project_id,))
    if not p:raise HTTPException(404,'Project not found')
    p['shots']=db.rows('SELECT * FROM shots WHERE project_id=? ORDER BY position',(project_id,))
    p['jobs']=db.rows('SELECT * FROM jobs WHERE project_id=? ORDER BY created_at DESC LIMIT 20',(project_id,))
    p['duration']=sum(s['duration'] for s in p['shots'])
    return p

@app.patch('/api/projects/{project_id}')
def update_project(project_id:str,p:ProjectUpdate,_:bool=Depends(auth)):
    if not db.one('SELECT id FROM projects WHERE id=?',(project_id,)):
        raise HTTPException(404,'Project not found')
    fields=p.model_dump(exclude_unset=True)
    if 'name' in fields and not fields['name']:raise HTTPException(422,'Name required')
    if 'accent' in fields or 'background' in fields:
        for c in ('accent','background'):
            if c in fields and (not fields[c] or not re.fullmatch(r'#[0-9a-fA-F]{6}',fields[c])):
                raise HTTPException(422,'Invalid color')
    if fields:
        fields['updated_at']=db.now()
        cols=', '.join(f'{k}=?' for k in fields)
        db.execute(f'UPDATE projects SET {cols} WHERE id=?',(*fields.values(),project_id))
    return get_project(project_id,True)

@app.post('/api/projects/{project_id}/shots',status_code=201)
def add_shot(project_id:str,shot:ShotCreate,_:bool=Depends(auth)):
    get_project(project_id,True)
    if shot.kind in ('photo','video'):
        if not shot.asset_id:raise HTTPException(422,'Select an asset for this shot')
        asset=db.one('SELECT * FROM assets WHERE id=?',(shot.asset_id,))
        if not asset:raise HTTPException(404,'Asset not found')
        if shot.kind=='photo' and not asset['media_type'].startswith('image/'):
            raise HTTPException(422,'Image required')
        if shot.kind=='video' and not asset['media_type'].startswith('video/'):
            raise HTTPException(422,'Video required')
    position=db.one('SELECT COALESCE(MAX(position),0)+1 AS n FROM shots WHERE project_id=?',(project_id,))['n']
    sid=db.uid()
    db.execute('INSERT INTO shots(id,project_id,position,kind,headline,subtitle,duration,asset_id) VALUES(?,?,?,?,?,?,?,?)',
      (sid,project_id,position,shot.kind,shot.headline,shot.subtitle,shot.duration,shot.asset_id))
    db.execute('UPDATE projects SET updated_at=? WHERE id=?',(db.now(),project_id))
    return get_project(project_id,True)

@app.delete('/api/projects/{project_id}/shots/{shot_id}')
def delete_shot(project_id:str,shot_id:str,_:bool=Depends(auth)):
    if not db.execute('DELETE FROM shots WHERE id=? AND project_id=?',(shot_id,project_id)):
        raise HTTPException(404,'Shot not found')
    return get_project(project_id,True)

@app.post('/api/projects/{project_id}/shots/reorder')
def reorder_shots(project_id:str,p:PositionUpdate,_:bool=Depends(auth)):
    ids=[x['id'] for x in db.rows('SELECT id FROM shots WHERE project_id=?',(project_id,))]
    if len(p.positions)!=len(ids) or set(p.positions)!=set(ids):
        raise HTTPException(422,'Must supply every shot once')
    with db.connect() as conn:
        for position,sid in enumerate(p.positions,1):
            conn.execute('UPDATE shots SET position=? WHERE id=? AND project_id=?',(position,sid,project_id))
    return get_project(project_id,True)

@app.get('/api/assets')
def assets(_:bool=Depends(auth)):
    return db.rows('SELECT * FROM assets ORDER BY created_at DESC')

@app.post('/api/assets',status_code=201)
async def upload_asset(file:UploadFile=File(...),_:bool=Depends(auth)):
    original=Path(file.filename or 'file').name
    suffix=Path(original).suffix.lower()
    if suffix not in EXTENSIONS:raise HTTPException(415,'Only standard images, video and audio files are accepted')
    aid=db.uid(); saved=f'{aid}{suffix}'
    dest=db.BASE/'assets'/saved
    bytes_written=0
    try:
        with dest.open('wb') as out:
            while chunk:=await file.read(1024*1024):
                bytes_written+=len(chunk)
                if bytes_written>MAX_UPLOAD:raise HTTPException(413,'File exceeds upload limit')
                out.write(chunk)
        if bytes_written==0:raise HTTPException(422,'Empty file')
        typ=EXTENSIONS[suffix]
        if typ.startswith('image/'):
            from PIL import Image
            try:
                with Image.open(dest) as img:
                    img.verify()
            except Exception:raise HTTPException(422,'Invalid image')
        else:
            try:
                probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=format_name',
                  '-of','default=noprint_wrappers=1',str(dest)],capture_output=True,text=True,timeout=15)
                if probe.returncode:raise HTTPException(422,'Invalid audio/video file')
            except FileNotFoundError:raise HTTPException(503,'ffprobe required for media validation')
        db.execute('INSERT INTO assets(id,filename,media_type,bytes,saved_name,created_at) VALUES(?,?,?,?,?,?)',
         (aid,original,typ,bytes_written,saved,db.now()))
        return db.one('SELECT * FROM assets WHERE id=?',(aid,))
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

@app.get('/api/assets/{asset_id}/file')
def asset_file(asset_id:str,_:bool=Depends(auth)):
    try:path,asset=safe_asset(asset_id)
    except ValueError:raise HTTPException(404,'Asset not found')
    return FileResponse(path,media_type=asset['media_type'],filename=asset['filename'],content_disposition_type='inline')

@app.post('/api/projects/{project_id}/narration/{asset_id}')
def set_narration(project_id:str,asset_id:str,_:bool=Depends(auth)):
    get_project(project_id,True)
    if asset_id!='none':
        try:_,asset=safe_asset(asset_id)
        except ValueError:raise HTTPException(404,'Asset not found')
        if not asset['media_type'].startswith('audio/'):
            raise HTTPException(422,'Narration must be audio')
    db.execute('UPDATE projects SET narration_asset=?, updated_at=? WHERE id=?',
       (None if asset_id=='none' else asset_id,db.now(),project_id))
    return get_project(project_id,True)

@app.post('/api/projects/{project_id}/tts')
def local_tts(project_id:str,_:bool=Depends(auth)):
    p=get_project(project_id,True)
    if not p['script'].strip():raise HTTPException(422,'Write a narration script first')
    if not shutil.which('espeak'):raise HTTPException(503,'Install espeak or import VoiceStudio audio')
    aid=db.uid();name=f'{aid}.wav';dest=db.BASE/'assets'/name
    try:
        result=subprocess.run(['espeak','-v','en','-s','135','-w',str(dest),'--stdin'],
           input=p['script'],text=True,capture_output=True,timeout=60)
        if result.returncode:raise RuntimeError('Speech synthesis failed')
        db.execute('INSERT INTO assets(id,filename,media_type,bytes,saved_name,created_at) VALUES(?,?,?,?,?,?)',
            (aid,'Local-draft-narration.wav','audio/wav',dest.stat().st_size,name,db.now()))
        db.execute('UPDATE projects SET narration_asset=?,updated_at=? WHERE id=?',(aid,db.now(),project_id))
        return {'asset_id':aid,'note':'Basic offline draft voice. For professional narration, import VoiceStudio WAV or MP3.'}
    except Exception:
        dest.unlink(missing_ok=True)
        raise

@app.post('/api/projects/{project_id}/captions')
def set_captions(project_id:str,c:CaptionUpload,_:bool=Depends(auth)):
    get_project(project_id,True)
    if c.srt.strip() and not re.search(r'\d\d:\d\d:\d\d,\d\d\d\s*-->\s*\d\d:',c.srt):
        raise HTTPException(422,'Upload SRT timestamps in HH:MM:SS,mmm format')
    db.execute('UPDATE projects SET captions=?,updated_at=? WHERE id=?',(c.srt,db.now(),project_id))
    return {'ok':True,'mode':'user-supplied-corrected-SRT'}

@app.get('/api/projects/{project_id}/captions/estimated.srt')
def estimated_captions(project_id:str,_:bool=Depends(auth)):
    p=get_project(project_id,True)
    srt=script_captions(p['script'],p['duration'])
    return PlainTextResponse(srt,headers={'Content-Disposition':f'attachment; filename="{project_id}-estimated.srt"'})

@app.get('/api/projects/{project_id}/storyboard.md')
def storyboard(project_id:str,_:bool=Depends(auth)):
    p=get_project(project_id,True)
    lines=[f"# {p['name']}",f"Client: {p['client']}",f"Format: {p['format']}",f"Description: {p['description']}",'','## Narration',p['script'],'','## Storyboard']
    for i,shot in enumerate(p['shots'],1):
        lines.extend([f"### {i}. {shot['headline']}",f"- Type: {shot['kind']}",f"- Duration: {shot['duration']} seconds",f"- Supporting text: {shot['subtitle']}",f"- Asset: {shot['asset_id'] or 'none'}",''])
    return PlainTextResponse('\n'.join(lines),headers={'Content-Disposition':f'attachment; filename="{project_id}-storyboard.md"'})


@app.get('/api/projects/{project_id}/bundle.zip')
def handoff_bundle(project_id:str,_:bool=Depends(auth)):
    """Generic portable handoff; not falsely labeled OpenCut-native project format."""
    p=get_project(project_id,True)
    target=db.BASE/'exports'/f'{project_id}-handoff.zip'
    manifest={**p,'schema':'flagship-studio/1','import_notice':'Generic handoff. Import media to OpenCut manually; native project format not guaranteed.'}
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5) as archive:
        archive.writestr('project/manifest.json',json.dumps(manifest,indent=2))
        archive.writestr('project/narration-script.txt',p['script'])
        archive.writestr('project/README.txt',
          'This bundle is an editorial handoff, not an OpenCut native project.\n'
          'Use source media in the media/ folder, narration and corrected captions\n'
          'to assemble or refine your film in your chosen external editor.\n')
        archive.writestr('project/captions.srt',p['captions'])
        archive.writestr('project/seo.json',json.dumps({
          'title':p['name'],'description':p['description'],'keywords':[], 'review_required':True},indent=2))
        asset_ids={shot['asset_id'] for shot in p['shots'] if shot['asset_id']}
        if p['narration_asset']:asset_ids.add(p['narration_asset'])
        for asset_id in asset_ids:
            path,asset=safe_asset(asset_id)
            archive.write(path,arcname=f"media/{asset['id']}{path.suffix.lower()}")
        result=db.one("SELECT output_file FROM jobs WHERE project_id=? AND status='completed' ORDER BY updated_at DESC LIMIT 1",(project_id,))
        if result and result['output_file']:
            output=Path(result['output_file']).resolve()
            if output.parent==(db.BASE/'renders').resolve() and output.is_file():
                archive.write(output,arcname='delivery/latest-master.mp4')
    return FileResponse(target,media_type='application/zip',filename=f'flagship-{project_id}-handoff.zip')

@app.get('/api/projects/{project_id}/seo.json')
def seo_metadata(project_id:str,_:bool=Depends(auth)):
    p=get_project(project_id,True)
    brief=db.one('SELECT * FROM seo_briefs WHERE project_id=?',(project_id,))
    text=(brief or {}).get('meta_description') or p['description'] or p['script'][:160]
    keywords=(brief or {}).get('keywords','').split(',')
    return {'title':((brief or {}).get('page_title') or p['name'])[:65],'description':text[:155],'type':'VideoObject',
            'duration_seconds':p['duration'],'keywords':[k.strip() for k in keywords if k.strip()], 'review_required':True,
            'note':'Review titles, keywords and video page metadata in OpenSEO before publishing.'}

@app.get('/api/projects/{project_id}/manifest.json')
def export_manifest(project_id:str,_:bool=Depends(auth)):
    p=get_project(project_id,True)
    return {**p,'schema':'flagship-studio/1','editor_handoff':'Generic project manifest, not an OpenCut-native import format.'}

def _render(project_id,job_id):
    def progress(value):
        db.execute('UPDATE jobs SET progress=?,updated_at=? WHERE id=?',(value,db.now(),job_id))
    try:
        db.execute("UPDATE jobs SET status='running',updated_at=? WHERE id=?",(db.now(),job_id))
        output=render_project(project_id,job_id,progress)
        db.execute("UPDATE jobs SET status='completed',progress=100,output_file=?,updated_at=? WHERE id=?",(str(output),db.now(),job_id))
    except Exception as e:
        db.execute("UPDATE jobs SET status='failed',error=?,updated_at=? WHERE id=?",(str(e)[:1100],db.now(),job_id))

@app.post('/api/projects/{project_id}/render',status_code=202)
def start_render(project_id:str,_:bool=Depends(auth)):
    p=get_project(project_id,True)
    if not p['shots']:raise HTTPException(422,'Add shots before rendering')
    if db.one("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')",(project_id,)):
        raise HTTPException(409,'Render already in progress')
    jid=db.uid();t=db.now()
    db.execute("INSERT INTO jobs(id,project_id,status,progress,created_at,updated_at) VALUES(?,?,'queued',0,?,?)",(jid,project_id,t,t))
    POOL.submit(_render,project_id,jid)
    return db.one('SELECT * FROM jobs WHERE id=?',(jid,))

@app.get('/api/jobs')
def jobs(_:bool=Depends(auth)):
    return db.rows('SELECT jobs.*,projects.name AS project_name FROM jobs LEFT JOIN projects ON jobs.project_id=projects.id ORDER BY jobs.created_at DESC LIMIT 75')

@app.get('/api/jobs/{job_id}')
def get_job(job_id:str,_:bool=Depends(auth)):
    job=db.one('SELECT * FROM jobs WHERE id=?',(job_id,))
    if not job:raise HTTPException(404,'Job not found')
    return job

@app.get('/api/jobs/{job_id}/download')
def download(job_id:str,_:bool=Depends(auth)):
    job=get_job(job_id,True)
    if job['status']!='completed' or not job['output_file']:raise HTTPException(409,'Render not complete')
    target=Path(job['output_file']).resolve()
    if target.parent!=(db.BASE/'renders').resolve() or not target.is_file():
        raise HTTPException(404,'Rendered file missing')
    return FileResponse(target,media_type='video/mp4',filename=f'flagship-{job_id}.mp4')

@app.get('/api/integrations')
def integrations(_:bool=Depends(auth)):
    return service_status()

@app.post('/api/integrations/plane/issue')
async def plane_issue(p:PlaneCreate,_:bool=Depends(auth)):
    return await create_plane_issue(p.name,p.description_html,p.project_id)

@app.post('/api/integrations/chatwoot/message')
async def chatwoot(p:ChatwootSend,_:bool=Depends(auth)):
    return await send_chatwoot_message(p.conversation_id,p.message)

@app.get('/api/integrations/cal/booking')
def booking(_:bool=Depends(auth)):
    link=os.getenv('CAL_BOOKING_URL','')
    if not link:raise HTTPException(409,'CAL_BOOKING_URL not configured')
    return {'url':link}

@app.post('/api/webhooks/{service}')
async def webhook(service:str,request:Request):
    """Optional signed notifications from your deployments. Never a remote command runner."""
    if service not in ('plane','chatwoot','cal','openseo','appflowy'):
        raise HTTPException(404,'Unknown service')
    secret=os.getenv('STUDIO_WEBHOOK_SECRET','')
    if not secret:raise HTTPException(503,'Webhook secret required')
    body=await request.body()
    if len(body)>262144:raise HTTPException(413,'Webhook too large')
    signature=request.headers.get('X-Studio-Signature','')
    correct=hmac.new(secret.encode(),body,'sha256').hexdigest()
    if not hmac.compare_digest(signature,correct):raise HTTPException(401,'Bad signature')
    try:payload=json.loads(body)
    except json.JSONDecodeError:raise HTTPException(422,'Invalid JSON')
    db.execute('INSERT INTO events(id,service,payload,created_at) VALUES (?,?,?,?)',(db.uid(),service,json.dumps(payload)[:50000],db.now()))
    return {'accepted':True}

@app.get('/api/events')
def events(_:bool=Depends(auth)):
    return db.rows('SELECT * FROM events ORDER BY created_at DESC LIMIT 50')

@app.post('/api/demo',status_code=201)
def create_demo(_:bool=Depends(auth)):
    p=create_project(ProjectCreate(name='The Future of Video Production',client='FLAGSHIP STUDIO',
       description='An original demo of the video production workflow.',format='landscape',
       script='One studio. Your story, your footage, your voice. From planning through production, all the way to delivery.'),True)
    for shot in [
      ShotCreate(kind='title',headline='ONE STUDIO.',subtitle='From concept to finished film.',duration=3.5),
      ShotCreate(kind='title',headline='YOUR STORY. YOUR VISION.',subtitle='Scripts  •  Voice  •  Footage  •  Captions',duration=4.5),
      ShotCreate(kind='end',headline='PRODUCE WITHOUT LIMITS.',subtitle='Local-first production. Your files remain yours.',duration=3.5)]:
        add_shot(p['id'],shot,True)
    return get_project(p['id'],True)

# Register optional local management modules after authentication is defined.
from .operations import register as register_management_routes
register_management_routes(app,auth)
