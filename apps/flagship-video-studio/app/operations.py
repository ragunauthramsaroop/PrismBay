"""Production management: tasks, client roster, consultations, and SEO briefs."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from typing import Literal
from . import db

class TaskIn(BaseModel):
    title: str=Field(min_length=1,max_length=160)
    project_id: str|None=None
    status: Literal['todo','in-progress','review','done']='todo'
    priority: Literal['low','normal','high','urgent']='normal'
    due_on: str|None=Field(default=None,max_length=30)
    owner: str=Field(default='',max_length=90)

class TaskEdit(BaseModel):
    status: Literal['todo','in-progress','review','done']|None=None
    priority: Literal['low','normal','high','urgent']|None=None
    title: str|None=Field(default=None,min_length=1,max_length=160)
    due_on: str|None=None
    owner: str|None=None

class ClientIn(BaseModel):
    name: str=Field(min_length=1,max_length=120)
    organization: str=Field(default='',max_length=120)
    email: str=Field(default='',max_length=220)
    notes: str=Field(default='',max_length=4000)
    conversation_id: int|None=None

class BookingIn(BaseModel):
    client_id: str
    project_id: str|None=None
    starts_at: str=Field(min_length=10,max_length=40)
    purpose: str=Field(default='',max_length=500)
    status: Literal['requested','confirmed','completed','cancelled']='requested'
    booking_url: str=Field(default='',max_length=500)

class SeoIn(BaseModel):
    primary_keyword: str=Field(default='',max_length=160)
    target_audience: str=Field(default='',max_length=220)
    page_title: str=Field(default='',max_length=120)
    meta_description: str=Field(default='',max_length=320)
    keywords: str=Field(default='',max_length=2000)
    research_notes: str=Field(default='',max_length=10000)

def register(app,auth):
    router=APIRouter(prefix='/api',dependencies=[Depends(auth)])

    @router.get('/tasks')
    def tasks():
        return db.rows("SELECT tasks.*,projects.name AS project_name FROM tasks LEFT JOIN projects ON projects.id=tasks.project_id ORDER BY CASE status WHEN 'done' THEN 2 ELSE 1 END,due_on IS NULL,due_on,created_at DESC")

    @router.post('/tasks',status_code=201)
    def add_task(p:TaskIn):
        if p.project_id and not db.one('SELECT id FROM projects WHERE id=?',(p.project_id,)):
            raise HTTPException(404,'Project not found')
        tid=db.uid();t=db.now()
        db.execute('INSERT INTO tasks(id,project_id,title,status,priority,due_on,owner,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
            (tid,p.project_id,p.title,p.status,p.priority,p.due_on,p.owner,t,t))
        return db.one('SELECT * FROM tasks WHERE id=?',(tid,))

    @router.patch('/tasks/{task_id}')
    def change_task(task_id:str,p:TaskEdit):
        fields=p.model_dump(exclude_unset=True)
        if not db.one('SELECT id FROM tasks WHERE id=?',(task_id,)):
            raise HTTPException(404,'Task not found')
        if fields:
            fields['updated_at']=db.now()
            db.execute('UPDATE tasks SET '+', '.join(k+'=?' for k in fields)+' WHERE id=?',(*fields.values(),task_id))
        return db.one('SELECT * FROM tasks WHERE id=?',(task_id,))

    @router.delete('/tasks/{task_id}',status_code=204)
    def remove_task(task_id:str):
        if not db.execute('DELETE FROM tasks WHERE id=?',(task_id,)):
            raise HTTPException(404,'Task not found')
        return Response(status_code=204)

    @router.get('/clients')
    def clients():
        return db.rows('SELECT * FROM clients ORDER BY created_at DESC')

    @router.post('/clients',status_code=201)
    def add_client(p:ClientIn):
        if p.email and (len(p.email.split('@'))!=2 or '.' not in p.email.split('@')[1]):
            raise HTTPException(422,'Invalid email')
        cid=db.uid()
        db.execute('INSERT INTO clients(id,name,organization,email,notes,conversation_id,created_at) VALUES(?,?,?,?,?,?,?)',
            (cid,p.name,p.organization,p.email,p.notes,p.conversation_id,db.now()))
        return db.one('SELECT * FROM clients WHERE id=?',(cid,))

    @router.get('/bookings')
    def bookings():
        return db.rows('SELECT bookings.*,clients.name AS client_name,projects.name AS project_name FROM bookings JOIN clients ON bookings.client_id=clients.id LEFT JOIN projects ON bookings.project_id=projects.id ORDER BY starts_at')

    @router.post('/bookings',status_code=201)
    def add_booking(p:BookingIn):
        if not db.one('SELECT id FROM clients WHERE id=?',(p.client_id,)):
            raise HTTPException(404,'Client not found')
        if p.project_id and not db.one('SELECT id FROM projects WHERE id=?',(p.project_id,)):
            raise HTTPException(404,'Project not found')
        try: datetime.fromisoformat(p.starts_at)
        except ValueError: raise HTTPException(422,'Use ISO 8601 date/time')
        bid=db.uid()
        db.execute('INSERT INTO bookings(id,client_id,project_id,starts_at,purpose,status,booking_url,created_at) VALUES (?,?,?,?,?,?,?,?)',
            (bid,p.client_id,p.project_id,p.starts_at,p.purpose,p.status,p.booking_url,db.now()))
        return db.one('SELECT * FROM bookings WHERE id=?',(bid,))

    @router.get('/seo/{project_id}')
    def seo_brief(project_id:str):
        project=db.one('SELECT * FROM projects WHERE id=?',(project_id,))
        if not project:raise HTTPException(404,'Project not found')
        return db.one('SELECT * FROM seo_briefs WHERE project_id=?',(project_id,)) or {
            'project_id':project_id,'primary_keyword':'','target_audience':'',
            'page_title':project['name'],'meta_description':project['description'],
            'keywords':'','research_notes':'','updated_at':None}

    @router.put('/seo/{project_id}')
    def put_seo(project_id:str,p:SeoIn):
        if not db.one('SELECT id FROM projects WHERE id=?',(project_id,)):
            raise HTTPException(404,'Project not found')
        db.execute('INSERT INTO seo_briefs(project_id,primary_keyword,target_audience,page_title,meta_description,keywords,research_notes,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET primary_keyword=excluded.primary_keyword,target_audience=excluded.target_audience,page_title=excluded.page_title,meta_description=excluded.meta_description,keywords=excluded.keywords,research_notes=excluded.research_notes,updated_at=excluded.updated_at',
          (project_id,p.primary_keyword,p.target_audience,p.page_title,p.meta_description,p.keywords,p.research_notes,db.now()))
        return db.one('SELECT * FROM seo_briefs WHERE project_id=?',(project_id,))

    app.include_router(router)
