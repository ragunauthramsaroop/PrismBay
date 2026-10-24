import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, Check, CheckCheck, CheckCircle2, CircleHelp,
  ClipboardList, Compass, Download, FileText, Globe2, Heart, LockKeyhole,
  Menu, MessageCircle, MessageSquarePlus, MoreHorizontal, Phone, Plus, Search,
  Send, Settings2, ShieldCheck, Sparkles, Users, Video, Wifi, X
} from 'lucide-react';
import './prototype.css';

type Page = 'chats' | 'spaces' | 'flow' | 'calls' | 'you';
type Context = 'personal' | 'work';
type Message = { id: string; body: string; mine: boolean; at: string; reaction?: string };
type Conversation = { id: string; title: string; initials: string; category: Context; unread: number; group: boolean; messages: Message[] };
type Task = { id: string; text: string; source: string; done: boolean; category: Context };
type Space = { id: string; title: string; description: string; members: number; joined: boolean; category: Context };
type Preferences = { compact: boolean; dark: boolean; quiet: boolean; lowData: boolean };
type Store = { conversations: Conversation[]; tasks: Task[]; spaces: Space[]; preferences: Preferences };
type Modal = 'chat' | 'task' | 'space' | null;

const STORAGE_KEY = 'nexus-next-prototype-v1';
const demoDate = '10:42';
const seed: Store = {
  conversations: [
    { id: 'maya', title: 'Maya Chen', initials: 'MC', category: 'personal', unread: 2, group: false, messages: [
      { id: 'm1', body: "I've reviewed the plan and added my comments.", mine: false, at: '10:32' },
      { id: 'm2', body: 'Great. Are we aligned on the next steps?', mine: true, at: '10:35' },
      { id: 'm3', body: 'Yes. We should confirm everything by Friday.', mine: false, at: '10:37' }
    ] },
    { id: 'family', title: 'Family Circle', initials: 'FC', category: 'personal', unread: 1, group: true, messages: [
      { id: 'f1', body: 'Saturday lunch starts at 1 PM. Looking forward to seeing everyone!', mine: false, at: '09:18' }
    ] },
    { id: 'alex', title: 'Alex Carter', initials: 'AC', category: 'personal', unread: 0, group: false, messages: [
      { id: 'a1', body: 'Thanks for your help with the event.', mine: false, at: 'Yesterday' }
    ] },
    { id: 'product', title: 'Product Team', initials: 'PT', category: 'work', unread: 2, group: true, messages: [
      { id: 'p1', body: 'The updated interface is ready for review.', mine: false, at: '09:42' },
      { id: 'p2', body: 'Please share feedback before the next meeting.', mine: false, at: '10:02' }
    ] },
    { id: 'leadership', title: 'Leadership Team', initials: 'LT', category: 'work', unread: 1, group: true, messages: [
      { id: 'l1', body: 'Our quarterly priorities are confirmed.', mine: false, at: 'Yesterday' }
    ] }
  ],
  tasks: [
    { id: 't1', text: 'Confirm the Friday plan', source: 'Maya Chen', done: false, category: 'personal' },
    { id: 't2', text: 'Prepare community gathering', source: 'Family Circle', done: false, category: 'personal' },
    { id: 't3', text: 'Review new interface', source: 'Product Team', done: false, category: 'work' },
    { id: 't4', text: 'Approve quarterly milestones', source: 'Leadership Team', done: true, category: 'work' }
  ],
  spaces: [
    { id: 's1', title: 'Creators Circle', description: 'Share work, feedback and practical ideas', members: 82, joined: true, category: 'personal' },
    { id: 's2', title: 'Community Projects', description: 'Organize events and volunteer activities', members: 136, joined: false, category: 'personal' },
    { id: 's3', title: 'Product Studio', description: 'Design decisions, files and weekly meetings', members: 24, joined: true, category: 'work' },
    { id: 's4', title: 'Partner Network', description: 'Projects, partnerships and shared planning', members: 47, joined: false, category: 'work' }
  ],
  preferences: { compact: false, dark: false, quiet: false, lowData: false }
};
function newId() { return (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now()) + String(Math.random()); }
function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seed);
    const value = JSON.parse(raw) as Store;
    if (!Array.isArray(value.conversations) || !Array.isArray(value.tasks) || !Array.isArray(value.spaces)) return structuredClone(seed);
    return { ...structuredClone(seed), ...value, preferences: { ...seed.preferences, ...(value.preferences || {}) } };
  } catch { return structuredClone(seed); }
}
const navItems: { id: Page; text: string; Icon: typeof MessageCircle }[] = [
  { id: 'chats', text: 'Chats', Icon: MessageCircle },
  { id: 'spaces', text: 'Spaces', Icon: Users },
  { id: 'flow', text: 'Flow', Icon: ClipboardList },
  { id: 'calls', text: 'Calls', Icon: Phone },
  { id: 'you', text: 'You', Icon: Settings2 }
];

export default function Prototype({ onExit }: { onExit: () => void }) {
  const [store, setStore] = useState<Store>(readStore);
  const [page, setPage] = useState<Page>('chats');
  const [context, setContext] = useState<Context>('personal');
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'action'>('all');
  const [draft, setDraft] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [modalText, setModalText] = useState('');
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingName, setMeetingName] = useState('Team catch-up');

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* browser storage disabled */ } }, [store]);
  const conversations = useMemo(() => store.conversations.filter(c => c.category === context).filter(c => {
    const matchesText = (c.title + ' ' + c.messages.map(m => m.body).join(' ')).toLowerCase().includes(filter.toLowerCase());
    const matchesTab = inboxFilter === 'all' || (inboxFilter === 'unread' ? c.unread > 0 : store.tasks.some(t => !t.done && t.source === c.title));
    return matchesText && matchesTab;
  }), [store.conversations, store.tasks, filter, inboxFilter, context]);
  const chosen = store.conversations.find(c => c.id === selected && c.category === context) || null;
  const myTasks = store.tasks.filter(t => t.category === context);
  const mySpaces = store.spaces.filter(s => s.category === context);
  const pendingTasks = myTasks.filter(t => !t.done).length;
  const unread = store.conversations.filter(c => c.category === context).reduce((n, c) => n + c.unread, 0);
  const prefs = store.preferences;
  function notify(message: string) { setNotice(message); }
  function enterConversation(id: string) {
    setSelected(id); setDraft(''); setPage('chats');
    setStore(prev => ({ ...prev, conversations: prev.conversations.map(c => c.id === id ? { ...c, unread: 0 } : c) }));
  }
  function sendMessage() {
    const body = draft.trim();
    if (!chosen || !body) return;
    if (body.length > 10000) return notify('The demo message limit is 10,000 characters.');
    const m: Message = { id: newId(), body, mine: true, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setStore(prev => ({ ...prev, conversations: prev.conversations.map(c => c.id === chosen.id ? { ...c, messages: [...c.messages, m] } : c) }));
    setDraft('');
    notify('Saved to this browser. No network message was sent.');
  }
  function showModal(next: Modal, initial = '') { setModal(next); setModalText(initial); }
  function submitModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = modalText.trim();
    if (!text) return;
    if (modal === 'chat') {
      const id = newId();
      setStore(prev => ({ ...prev, conversations: [{ id, title: text.slice(0, 70), initials: text.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase(), category: context, unread: 0, group: false, messages: [] }, ...prev.conversations] }));
      setSelected(id); setPage('chats');
    } else if (modal === 'task') {
      setStore(prev => ({ ...prev, tasks: [{ id: newId(), text: text.slice(0, 250), category: context, source: chosen?.title || 'Personal task', done: false }, ...prev.tasks] }));
      setPage('flow');
    } else if (modal === 'space') {
      setStore(prev => ({ ...prev, spaces: [{ id: newId(), title: text.slice(0, 70), category: context, description: 'Your new local demonstration space', members: 1, joined: true }, ...prev.spaces] }));
      setPage('spaces');
    }
    setModal(null); setModalText(''); notify('Saved in your local prototype workspace.');
  }
  function toggleTask(id: string) {
    setStore(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }
  function toggleSpace(id: string) {
    setStore(prev => ({ ...prev, spaces: prev.spaces.map(s => s.id === id ? { ...s, joined: !s.joined, members: s.members + (s.joined ? -1 : 1) } : s) }));
  }
  function setPref(key: keyof Preferences) {
    setStore(prev => ({ ...prev, preferences: { ...prev.preferences, [key]: !prev.preferences[key] } }));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'nexus-prototype-demo-data.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function resetData() {
    if (!window.confirm('Reset your locally stored demo conversations, tasks and settings?')) return;
    setStore(structuredClone(seed)); setSelected(null); setPage('chats'); notify('Demo workspace reset.');
  }
  function makeMeeting() {
    const id = newId().replace(/-/g, '');
    setMeetingUrl('https://meet.jit.si/NexusDemo-' + id);
    notify('Meeting link created. Calls will use the external Jitsi Meet service.');
  }
  const heroName = context === 'personal' ? 'Your connections, in focus.' : 'Make every conversation count.';
  return <div className={'nxp' + (prefs.dark ? ' nxp-dark' : '') + (prefs.compact ? ' nxp-compact' : '')}>
    <aside className={'nxp-rail' + (menuOpen ? ' nxp-rail-open' : '')}>
      <div className="nxp-logo"><span className="nxp-logo-icon">✦</span><span>Nexus<span className="nxp-logo-accent">.</span></span></div>
      <span className="nxp-rail-label">YOUR WORKSPACE</span>
      <div className="nxp-nav" aria-label="Product sections">{navItems.map(({ id, text, Icon }) => <button key={id} type="button" className={'nxp-nav-link' + (page === id ? ' current' : '')} onClick={() => { setPage(id); setMenuOpen(false); setNotice(''); }}><Icon size={19}/>{text}{id === 'flow' && pendingTasks > 0 && <span className="nxp-nav-count">{pendingTasks}</span>}</button>)}</div>
      <div className="nxp-rail-bottom">
        <div className="nxp-demo-note"><ShieldCheck size={17}/><span><strong>Interactive prototype</strong><small>Local example data, not live accounts</small></span></div>
        <button className="nxp-exit" type="button" onClick={onExit}><ArrowLeft size={16}/> Back to Matrix messenger</button>
      </div>
    </aside>
    {menuOpen && <button type="button" className="nxp-mobile-overlay" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>}
    <div className="nxp-workspace">
      <header className="nxp-topbar">
        <div className="nxp-top-left"><button className="nxp-mobile-menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="nxp-breadcrumb">NEXUS <span>/</span> {page === 'you' ? 'Account' : page[0].toUpperCase() + page.slice(1)}</div></div>
        <div className="nxp-top-right"><div className="nxp-context" role="group" aria-label="Workspace context">
          <button className={context === 'personal' ? 'active' : ''} onClick={() => { setContext('personal'); setSelected(null); }} type="button">Personal</button>
          <button className={context === 'work' ? 'active' : ''} onClick={() => { setContext('work'); setSelected(null); }} type="button">Work</button>
        </div><span className="nxp-profile">R</span></div>
      </header>
      <div className="nxp-noticebar"><span><Sparkles size={13}/> PROTOTYPE MODE</span> All sample messages, decisions and settings stay on this browser. They do not reach Matrix or other users.</div>
      {notice && <div className="nxp-toast" role="status">{notice}<button aria-label="Dismiss notice" type="button" onClick={() => setNotice('')}><X size={15}/></button></div>}
      <main className="nxp-main">
        {page === 'chats' && !chosen && <section className="nxp-inbox nxp-page">
          <div className="nxp-heading-row"><div><span className="nxp-eyebrow">YOUR COMMUNICATION SPACE</span><h1>{heroName}</h1><p>People, conversations and decisions together, without the noise.</p></div><button className="nxp-primary" type="button" onClick={() => showModal('chat')}><Plus size={17}/> New conversation</button></div>
          <div className="nxp-overview"><div className="nxp-overview-copy"><span><Sparkles size={16}/> YOUR FOCUS</span><h2>{unread > 0 ? String(unread) + ' unread messages. ' : 'You are caught up. '}{pendingTasks} item{pendingTasks === 1 ? '' : 's'} need your attention.</h2><p>The important things rise above the noise. You decide what matters.</p></div><button type="button" onClick={() => setPage('flow')} className="nxp-whitebutton">View my actions <ArrowRight size={16}/></button></div>
          <div className="nxp-content-grid"><div className="nxp-panel">
            <div className="nxp-panel-header"><h2>Conversations</h2><span>{conversations.length} shown</span></div>
            <label className="nxp-search"><Search size={18}/><input aria-label="Search conversations" placeholder="Search conversations and messages" value={filter} onChange={e => setFilter(e.target.value)}/></label>
            <div className="nxp-tabs" role="group" aria-label="Filter conversations">{(['all','unread','action'] as const).map(f => <button type="button" className={inboxFilter === f ? 'selected' : ''} key={f} onClick={() => setInboxFilter(f)}>{f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Needs action'}</button>)}</div>
            <div className="nxp-conversation-list">{conversations.length === 0 && <div className="nxp-empty">No conversations match. Try another filter.</div>}{conversations.map((c,i) => {const latest = c.messages.at(-1);return <button className="nxp-conversation" type="button" onClick={() => enterConversation(c.id)} key={c.id}><span className={'nxp-avatar nxp-av'+ (i % 5)}>{c.initials}</span><span className="nxp-conversation-copy"><strong>{c.title}</strong><small>{latest?.body || 'Start a new conversation'}</small></span><span className="nxp-conversation-meta"><small>{latest?.at || 'New'}</small>{c.unread > 0 && <b>{c.unread}</b>}</span></button>})}</div>
          </div><aside className="nxp-insights">
            <div className="nxp-small-panel"><span className="nxp-card-icon"><ClipboardList size={19}/></span><strong>Decisions that move</strong><p>Turn a conversation into a task without losing its context.</p><button type="button" onClick={() => setPage('flow')}>Open Flow <ArrowRight size={15}/></button></div>
            <div className="nxp-small-panel"><span className="nxp-card-icon green"><ShieldCheck size={19}/></span><strong>Your privacy matters</strong><p>Local demo content is separate from live encrypted Matrix conversations.</p><button type="button" onClick={() => setPage('you')}>Privacy controls <ArrowRight size={15}/></button></div>
          </aside></div>
        </section>}
        {page === 'chats' && chosen && <section className="nxp-chat nxp-page">
          <div className="nxp-chat-head"><button className="nxp-icon-button" aria-label="Back to conversations" type="button" onClick={() => setSelected(null)}><ArrowLeft size={19}/></button><span className="nxp-avatar nxp-av1">{chosen.initials}</span><div className="nxp-chat-identity"><strong>{chosen.title}</strong><small><CircleHelp size={13}/> Local demonstration conversation, no network encryption</small></div><button className="nxp-outline" type="button" onClick={() => showModal('task', 'Follow up with ' + chosen.title)}><ClipboardList size={16}/> Create task</button></div>
          <div className="nxp-chat-body"><div className="nxp-chat-day">Today · local demo messages</div>{chosen.messages.length === 0 && <div className="nxp-empty">Your conversation starts here.</div>}{chosen.messages.map(m => <div className={'nxp-message-line' + (m.mine ? ' mine' : '')} key={m.id}><div className="nxp-bubble">{m.body}<small>{m.at}{m.mine && <CheckCheck size={12} aria-label="Saved locally"/>}</small></div></div>)}
          <div className="nxp-decision"><span className="nxp-eyebrow"><ClipboardList size={14}/> CONVERSATION ACTIONS</span><strong>Keep outcomes connected to the discussion</strong><p>Create a follow-up task. It will appear in your Flow workspace, linked to this conversation.</p><button type="button" onClick={() => showModal('task', 'Follow up: ' + chosen.title)}><Plus size={16}/> Create follow-up</button></div>
          </div>
          <form className="nxp-composer" onSubmit={e => { e.preventDefault(); sendMessage(); }}><input aria-label="Type a demonstration message" placeholder={'Message ' + chosen.title + ' (local only)'} maxLength={10000} value={draft} onChange={e => setDraft(e.target.value)}/><button disabled={!draft.trim()} className="nxp-send" type="submit" aria-label="Send local demo message"><Send size={19}/></button></form>
        </section>}
        {page === 'flow' && <section className="nxp-page"><div className="nxp-heading-row"><div><span className="nxp-eyebrow">FROM MESSAGES TO OUTCOMES</span><h1>Make progress. Stay connected.</h1><p>Real, interactive tasks stored in your browser.</p></div><button className="nxp-primary" type="button" onClick={() => showModal('task')}><Plus size={17}/> Add a task</button></div>
          <div className="nxp-stats"><div><strong>{myTasks.length}</strong><span>Total actions</span></div><div><strong>{pendingTasks}</strong><span>Need attention</span></div><div><strong>{myTasks.length - pendingTasks}</strong><span>Completed</span></div></div>
          <div className="nxp-panel nxp-flow-panel"><div className="nxp-panel-header"><h2>My actions</h2><span>{context} workspace</span></div>{myTasks.length === 0 && <div className="nxp-empty">No tasks yet. Add your first action.</div>}{myTasks.map(t => <div key={t.id} className={'nxp-task' + (t.done ? ' completed' : '')}><button type="button" className={'nxp-check' + (t.done ? ' done' : '')} onClick={() => toggleTask(t.id)} aria-label={(t.done ? 'Mark incomplete ' : 'Complete ') + t.text}>{t.done && <Check size={16}/>}</button><div><strong>{t.text}</strong><small>From {t.source}</small></div><span className="nxp-task-status">{t.done ? 'Completed' : 'Open'}</span></div>)}</div>
          <div className="nxp-feature-note"><Heart size={18}/> Tasks here are functional, but local to this browser. Shared task synchronization is a future feature.</div>
        </section>}
        {page === 'spaces' && <section className="nxp-page"><div className="nxp-heading-row"><div><span className="nxp-eyebrow">GROUPS AND COMMUNITIES</span><h1>Find your people.</h1><p>Give every group a home, with practical tools for shared plans.</p></div><button className="nxp-primary" type="button" onClick={() => showModal('space')}><Plus size={17}/> Create space</button></div>
          <div className="nxp-space-hero"><div><span className="nxp-eyebrow">COMMUNITY FIRST</span><h2>Spaces built around people, not endless feeds.</h2><p>Keep discussions, events and responsibilities in one organized place.</p></div><Compass size={70} strokeWidth={1.1}/></div>
          <div className="nxp-panel"><div className="nxp-panel-header"><h2>Explore spaces</h2><span>{mySpaces.length} communities</span></div><div className="nxp-space-list">{mySpaces.map((s,i) => <div className="nxp-space" key={s.id}><span className={'nxp-space-art nxp-av'+i%5}><Users size={22}/></span><div><strong>{s.title}</strong><small>{s.description}</small><span>{s.members} members · {s.joined ? 'Joined' : 'Open to join'}</span></div><button type="button" className={s.joined ? 'nxp-outline' : 'nxp-primary'} onClick={() => toggleSpace(s.id)}>{s.joined ? 'Leave' : 'Join'}</button></div>)}</div></div>
          <div className="nxp-feature-note"><Globe2 size={18}/> Joining here updates local demonstration membership only. Matrix communities are not yet connected.</div>
        </section>}
        {page === 'calls' && <section className="nxp-page"><div className="nxp-heading-row"><div><span className="nxp-eyebrow">STAY CLOSE FROM ANYWHERE</span><h1>Meet face to face.</h1><p>Fast group call initiation, with a clear choice of service.</p></div></div>
          <div className="nxp-call-card"><div className="nxp-call-orb"><Video size={48}/></div><span className="nxp-eyebrow">REAL EXTERNAL TEST MEETING</span><h2>Bring your conversation to life.</h2><p>Launch a live Jitsi Meet room in a new browser tab. Jitsi is a third-party service, not part of the Nexus encrypted messaging server.</p>
          <label htmlFor="nxp-meeting-name">Meeting label</label><input id="nxp-meeting-name" maxLength={80} value={meetingName} onChange={e => setMeetingName(e.target.value)}/><div className="nxp-call-actions"><button className="nxp-primary" type="button" onClick={makeMeeting}><Video size={17}/> Create meeting link</button>{meetingUrl && <a className="nxp-outline" href={meetingUrl} target="_blank" rel="noopener noreferrer">Open meeting <ArrowRight size={16}/></a>}</div>
          {meetingUrl && <div className="nxp-meeting-link"><span>{meetingName || 'Meeting'}</span><code>{meetingUrl}</code><button type="button" onClick={() => { if (!navigator.clipboard) { notify('Clipboard unavailable. Select the URL and copy it manually.'); return; } void navigator.clipboard.writeText(meetingUrl).then(() => notify('Meeting URL copied.')).catch(() => notify('Clipboard access denied.')); }}>Copy invite link</button></div>}</div>
        </section>}
        {page === 'you' && <section className="nxp-page"><div className="nxp-heading-row"><div><span className="nxp-eyebrow">YOUR ACCOUNT, YOUR RULES</span><h1>Make Nexus yours.</h1><p>Personalize your workspace. Review how this prototype handles your local data.</p></div></div>
          <div className="nxp-account"><span className="nxp-account-avatar">R</span><div><strong>Prototype account</strong><small>Demo workspace · no Matrix account required</small></div><span className="nxp-safety"><ShieldCheck size={14}/> Local only</span></div>
          <div className="nxp-panel nxp-settings-panel"><div className="nxp-panel-header"><h2>Preferences</h2><span>Stored locally</span></div>
          {([
            {key:'dark',label:'Dark appearance',description:'Change the entire interface to the dark theme',Icon:Sparkles},
            {key:'compact',label:'Compact conversations',description:'Show denser conversation and task rows',Icon:Menu},
            {key:'quiet',label:'Quiet mode',description:'Remember a local notification preference',Icon:Bell},
            {key:'lowData',label:'Low-data mode',description:'Save a preference for future media settings',Icon:Wifi}
          ] as const).map(({key,label,description,Icon}) => <div className="nxp-setting" key={key}><span className="nxp-setting-icon"><Icon size={19}/></span><div><strong>{label}</strong><small>{description}</small></div><button type="button" aria-label={label} role="switch" aria-checked={prefs[key]} className={'nxp-toggle' + (prefs[key] ? ' on' : '')} onClick={() => setPref(key)}><span/></button></div>)}
          </div>
          <div className="nxp-panel nxp-settings-panel"><div className="nxp-panel-header"><h2>Your demonstration data</h2><span>Browser only</span></div><div className="nxp-data-actions"><button type="button" className="nxp-outline" onClick={exportData}><Download size={17}/> Export local data</button><button type="button" className="nxp-outline" onClick={resetData}>Reset prototype</button></div><p className="nxp-data-disclaimer"><LockKeyhole size={15}/> This prototype does not verify contacts, back up encryption keys, or connect simulated conversations to the Matrix network.</p></div>
        </section>}
      </main>
      <nav className="nxp-mobile-nav" aria-label="Main navigation">{navItems.map(({id,text,Icon}) => <button key={id} type="button" className={page === id ? 'active' : ''} onClick={() => {setPage(id);setMenuOpen(false);}}><Icon size={19}/><span>{text}</span></button>)}</nav>
    </div>
    {modal && <div className="nxp-modal-back" onMouseDown={e => {if (e.target === e.currentTarget) setModal(null);}}><section className="nxp-modal" role="dialog" aria-modal="true" aria-labelledby="nxp-dialog-title"><button type="button" className="nxp-modal-close" aria-label="Close" onClick={() => setModal(null)}><X size={20}/></button><span className="nxp-card-icon"><MessageSquarePlus size={21}/></span><span className="nxp-eyebrow">LOCAL PROTOTYPE ACTION</span><h2 id="nxp-dialog-title">{modal === 'chat' ? 'Start a conversation' : modal === 'task' ? 'Create an action' : 'Create a space'}</h2><p>Changes are saved to your browser. No invitation or network message is sent.</p><form onSubmit={submitModal}><label htmlFor="nxp-modal-text">{modal === 'chat' ? 'Person or group name' : modal === 'task' ? 'What needs to be done?' : 'Community name'}</label><input id="nxp-modal-text" autoFocus required maxLength={250} placeholder={modal === 'task' ? 'Review the shared plan' : 'Enter a name'} value={modalText} onChange={e => setModalText(e.target.value)}/><button type="submit" className="nxp-primary">Save to my prototype <ArrowRight size={17}/></button></form></section></div>}
  </div>;
}
