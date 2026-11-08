"""Ten truthful integrations: usable capabilities and documented external handoffs.

Not every upstream exposes a safe public API. Entries distinguish operational
connectors from manual/import handoffs. Credentials are only read from env vars.
"""
import os
import httpx
from fastapi import HTTPException

SERVICES = [
  {'id':'opencut', 'name':'OpenCut', 'category':'Editing', 'role':'Timeline editing and visual effects', 'mode':'handoff', 'url':'https://opencut.app', 'repo':'https://github.com/OpenCut-app/OpenCut', 'env':None, 'details':'Launch editor; hand off exported MP4 and source assets. No direct editor API assumed.'},
  {'id':'voicestudio', 'name':'VoiceStudio', 'category':'Audio', 'role':'Narration, dubbing and authorized voice cloning', 'mode':'handoff', 'url':'https://voicestudio.sh', 'repo':'https://github.com/debpalash/VoiceStudio', 'env':None, 'details':'Generate voice locally in VoiceStudio; upload audio into your project. Voice cloning requires the speaker’s permission.'},
  {'id':'appflowy', 'name':'AppFlowy', 'category':'Planning', 'role':'Scripts, storyboards and research library', 'mode':'export', 'url':'https://appflowy.com', 'repo':'https://github.com/AppFlowy-IO/AppFlowy', 'env':None, 'details':'Export each storyboard as Markdown and import into your AppFlowy workspace.'},
  {'id':'plane', 'name':'Plane', 'category':'Planning', 'role':'Production tasks and delivery tracking', 'mode':'api', 'url':'https://plane.so', 'repo':'https://github.com/makeplane/plane', 'env':'PLANE_API_KEY', 'details':'Create production issues in Plane using the API.'},
  {'id':'cal', 'name':'Cal.diy', 'category':'Clients', 'role':'Consultation booking', 'mode':'link', 'url':'https://github.com/calcom/cal.diy', 'repo':'https://github.com/calcom/cal.diy', 'env':'CAL_BOOKING_URL', 'details':'Configure the scheduling URL for your self-hosted instance. Cal.diy is not recommended upstream for commercial production.'},
  {'id':'chatwoot', 'name':'Chatwoot', 'category':'Clients', 'role':'Client conversation and approvals', 'mode':'api', 'url':'https://www.chatwoot.com', 'repo':'https://github.com/chatwoot/chatwoot', 'env':'CHATWOOT_API_TOKEN', 'details':'Send status updates to an existing conversation using a documented API endpoint.'},
  {'id':'openseo', 'name':'OpenSEO', 'category':'Distribution', 'role':'Keywords, video-page titles and visibility', 'mode':'export', 'url':'https://openseo.so', 'repo':'https://github.com/every-app/open-seo', 'env':None, 'details':'Export SEO metadata as JSON and review in OpenSEO; external data API fees are optional, not silently invoked.'},
  {'id':'cap', 'name':'Cap', 'category':'Capture', 'role':'Screen recordings and tutorials', 'mode':'upload', 'url':'https://cap.so', 'repo':'https://github.com/CapSoftware/Cap', 'env':None, 'details':'Record in Cap and import MP4 into the asset library.'},
  {'id':'dyad', 'name':'Dyad', 'category':'Development', 'role':'Local AI-assisted interface development', 'mode':'development', 'url':'https://dyad.sh', 'repo':'https://github.com/dyad-sh/dyad', 'env':None, 'details':'Use Dyad to customize this frontend; Dyad is a development tool, not an editing backend.'},
  {'id':'openwhispr', 'name':'OpenWhispr', 'category':'Subtitles', 'role':'Transcripts and caption preparation', 'mode':'handoff', 'url':'https://openwhispr.com', 'repo':'https://github.com/OpenWhispr/openwhispr', 'env':None, 'details':'Transcribe locally; upload corrected SRT to the project for burned-in captions.'},
]

def service_status():
    response=[]
    for service in SERVICES:
        s=service.copy()
        s['configured']=bool(s['env'] and os.getenv(s['env']))
        s['status']='connected' if s['configured'] else ('ready' if not s['env'] else 'needs-configuration')
        response.append(s)
    return response

async def create_plane_issue(name, description_html, project_id):
    key=os.getenv('PLANE_API_KEY')
    workspace=os.getenv('PLANE_WORKSPACE_SLUG')
    base=os.getenv('PLANE_BASE_URL','https://api.plane.so').rstrip('/')
    if not key or not workspace:
        raise HTTPException(409, 'Configure PLANE_API_KEY and PLANE_WORKSPACE_SLUG')
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response=await client.post(f'{base}/api/v1/workspaces/{workspace}/projects/{project_id}/issues/',
              headers={'X-API-Key':key},json={'name':name,'description_html':description_html})
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(502, f'Plane request failed: {type(e).__name__}')

async def send_chatwoot_message(conversation_id, message):
    base=os.getenv('CHATWOOT_BASE_URL','').rstrip('/')
    token=os.getenv('CHATWOOT_API_TOKEN')
    account=os.getenv('CHATWOOT_ACCOUNT_ID')
    if not all((base,token,account)):
        raise HTTPException(409, 'Configure CHATWOOT_BASE_URL, CHATWOOT_API_TOKEN and CHATWOOT_ACCOUNT_ID')
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response=await client.post(f'{base}/api/v1/accounts/{account}/conversations/{conversation_id}/messages',
              headers={'api_access_token':token},json={'content':message,'message_type':'outgoing','private':False})
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(502, f'Chatwoot request failed: {type(e).__name__}')
