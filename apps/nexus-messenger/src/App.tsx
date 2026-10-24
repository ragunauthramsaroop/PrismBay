import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, Globe2, Hash, Inbox,
  KeyRound, Link2, LoaderCircle, LockKeyhole, LogOut, Menu, MessageCircle,
  Plus, Search, Send, ShieldCheck, Sparkles, UserPlus, Users, Wifi, WifiOff, X,
  Reply, Heart, ThumbsUp, Trash2, ChevronUp, ExternalLink, Pencil, Copy,
} from 'lucide-react';
import * as sdk from 'matrix-js-sdk';
import type { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { cleanError, validateMessage, validateUserId } from './domain.mjs';
import {
  createPrivateRoom, createSessionClient, forgetSession, getPreferredHomeserver,
  getStoredSession, saveSession, signIn,
} from './matrix';
import type { Session } from './matrix';

type Modal = 'create' | 'join' | 'invite' | null;

const MONOGRAM_COLORS = ['#6056d5', '#0f8f93', '#bd6f43', '#8b64aa', '#507fbd', '#ba5981'];

function initials(name: string): string {
  const simple = name.replace(/^@/, '').split(':')[0];
  return simple.split(/[\s._-]+/).slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('').slice(0, 2) || '?';
}

function colorFor(value: string): string {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
}

function Avatar({ name, size = 'regular' }: { name: string; size?: 'regular' | 'large' | 'small' }) {
  return <span className={`avatar avatar-${size}`} style={{ background: colorFor(name) }} aria-hidden="true">{initials(name)}</span>;
}

function Clock({ timestamp }: { timestamp: number }) {
  return <time dateTime={new Date(timestamp).toISOString()}>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>;
}

function messageText(event: MatrixEvent): string {
  if (event.isDecryptionFailure()) return 'Unable to decrypt this message. Verify your devices or restore your keys.';
  const content = event.getContent();
  if (typeof content.body === 'string') return content.body;
  if (event.isEncrypted()) return 'Decrypting encrypted message…';
  return 'Unsupported message type';
}

function roomEvents(room: Room | null): MatrixEvent[] {
  if (!room) return [];
  return room.getLiveTimeline().getEvents().filter((event) =>
    event.getType() === 'm.room.message' || event.getType() === 'm.room.encrypted',
  ).filter((event) => event.getContent()?.['m.relates_to']?.rel_type !== 'm.replace');
}

function AppLogo({ large = false }: { large?: boolean }) {
  return <div className={`brand ${large ? 'brand-large' : ''}`}>
    <span className="brand-mark"><MessageCircle size={large ? 27 : 21} strokeWidth={2.5} /><span className="brand-dot" /></span>
    <span className="brand-word">nexus<span>messenger</span></span>
  </div>;
}

function Login({ onLoggedIn, onPreview }: { onLoggedIn: (session: Session) => void; onPreview: () => void }) {
  const [homeserver, setHomeserver] = useState(getPreferredHomeserver);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError('');
    try {
      const session = await signIn(homeserver, userId, password);
      saveSession(session);
      setPassword('');
      onLoggedIn(session);
    } catch (cause) {
      setError(cleanError(cause));
    } finally { setWorking(false); }
  }

  return <main className="login-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <div className="login-top"><AppLogo /></div>
    <div className="login-content">
      <section className="login-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> INDEPENDENT COMMUNICATION</div>
        <h1>Every conversation.<br /><span>One place.</span></h1>
        <p>Connect with people across the open Matrix network. Your conversations are yours, across devices and servers.</p>
        <div className="login-features">
          <div><span><LockKeyhole size={17} /></span><div><strong>Encrypted private rooms</strong><small>Matrix encryption with the Rust crypto SDK</small></div></div>
          <div><span><Globe2 size={17} /></span><div><strong>Open, federated network</strong><small>Connect to compatible Matrix homeservers</small></div></div>
          <div><span><ShieldCheck size={17} /></span><div><strong>No tracking SDKs</strong><small>No advertising or analytics embedded</small></div></div>
        </div>
      </section>
      <section className="login-card" aria-labelledby="login-heading">
        <div className="card-icon"><MessageCircle size={22} /></div>
        <div className="card-kicker">WELCOME TO NEXUS</div>
        <h2 id="login-heading">Sign in to your account</h2>
        <p className="card-subtitle">Use an existing Matrix account. New account registration is managed by your homeserver.</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="homeserver">Homeserver URL</label>
          <div className="field"><Globe2 size={17} /><input id="homeserver" type="url" value={homeserver} onChange={(e) => setHomeserver(e.target.value)} required autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://matrix.example.org" /></div>
          <label htmlFor="mxid">Matrix user ID</label>
          <div className="field"><Users size={17} /><input id="mxid" value={userId} onChange={(e) => setUserId(e.target.value)} required autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="@you:example.org" /></div>
          <label htmlFor="password">Password</label>
          <div className="field"><KeyRound size={17} /><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your Matrix password" /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-primary login-submit" type="submit" disabled={working}>{working ? <LoaderCircle size={17} className="spin" /> : <>Connect securely <ArrowRight size={17} /></>}</button>
        </form>
        <a className="btn btn-outline login-submit" style={{ marginTop: 12, textDecoration: 'none' }} href="https://app.element.io/" target="_blank" rel="noopener noreferrer">New to Matrix? Create an account <ExternalLink size={16}/></a>
        <button className="btn btn-outline login-submit" type="button" onClick={onPreview} style={{ marginTop: 12 }}><Sparkles size={17}/> Explore the new Nexus prototype <ArrowRight size={17}/></button>
        <div className="login-foot"><LockKeyhole size={14} /> Your password is sent to your selected homeserver. Nexus does not store passwords.</div>
      </section>
    </div>
    <footer className="login-footer">NEXUS MESSENGER <span>·</span> OPEN PROTOCOL <span>·</span> MVP RELEASE 0.1</footer>
  </main>;
}

export default function App({ onPreview }: { onPreview: () => void }) {
  const [session, setSession] = useState<Session | null>(getStoredSession);
  const [client, setClient] = useState<MatrixClient | null>(null);
  const clientRef = useRef<MatrixClient | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [modalValue, setModalValue] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ eventId: string; snippet: string } | null>(null);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyDone, setHistoryDone] = useState(false);
  const [eventBusy, setEventBusy] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [, forceRender] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback((active: MatrixClient) => {
    const found = active.getRooms().filter((room) => ['join', 'invite'].includes(room.getMyMembership()));
    found.sort((a, b) => b.getLastActiveTimestamp() - a.getLastActiveTimestamp());
    setRooms(found);
    setSelectedId((old) => old && found.some((room) => room.roomId === old) ? old : (found.find((room) => room.getMyMembership() === 'join')?.roomId || found[0]?.roomId || null));
    forceRender((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!session) return;
    let closed = false;
    const active = createSessionClient(session);
    clientRef.current = active;
    setStatus('connecting');
    const onSync = (syncState: string) => {
      if (closed) return;
      setStatus(syncState === 'ERROR' || syncState === 'STOPPED' ? 'offline' : syncState === 'SYNCING' || syncState === 'PREPARED' ? 'online' : 'connecting');
      refresh(active);
    };
    const onTimeline = (event: MatrixEvent) => {
      if (closed) return;
      event.on(sdk.MatrixEventEvent.Decrypted, () => { if (!closed) refresh(active); });
      refresh(active);
    };
    active.on(sdk.ClientEvent.Sync, onSync);
    active.on(sdk.RoomEvent.Timeline, onTimeline);
    // Decrypted messages can arrive after the timeline event.
    (async () => {
      try {
        await active.initRustCrypto();
        if (closed) return;
        setClient(active);
        await active.startClient({ initialSyncLimit: 50 });
      } catch (cause) {
        if (!closed) { setError(`Unable to initialize Matrix: ${cleanError(cause)}`); setStatus('offline'); }
      }
    })();
    return () => {
      closed = true;
      active.removeListener(sdk.ClientEvent.Sync, onSync);
      active.removeListener(sdk.RoomEvent.Timeline, onTimeline);
      active.stopClient();
      if (clientRef.current === active) clientRef.current = null;
    };
  }, [session, refresh]);

  const chosen = useMemo(() => rooms.find((room) => room.roomId === selectedId) || null, [rooms, selectedId]);
  const messages = chosen ? roomEvents(chosen) : [];
  const matches = rooms.filter((room) => (room.name || room.roomId).toLowerCase().includes(filter.toLowerCase()));
  const encryptionEnabled = Boolean(chosen?.currentState.getStateEvents('m.room.encryption', ''));
  const visibleReactionCounts = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    if (!chosen) return result;
    const members = new Set<string>();
    for (const event of chosen.getLiveTimeline().getEvents()) {
      if (event.getType() !== 'm.reaction' || event.isRedacted()) continue;
      const relation = event.getContent()?.['m.relates_to'];
      if (!relation || relation.rel_type !== 'm.annotation' || typeof relation.event_id !== 'string' || typeof relation.key !== 'string') continue;
      const sender = event.getSender() || event.getId() || '';
      const pair = relation.event_id + '|' + relation.key + '|' + sender;
      if (members.has(pair)) continue;
      members.add(pair);
      result[relation.event_id] ??= {};
      result[relation.event_id][relation.key] = (result[relation.event_id][relation.key] || 0) + 1;
    }
    return result;
  // forceRender changes when SDK timeline objects mutate in place
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, rooms, messages.length]);
  const isJoined = chosen?.getMyMembership() === 'join';

  useEffect(() => { setReplyTarget(null); setEditingTarget(null); setHistoryDone(false); }, [selectedId]);
  useEffect(() => { if (!historyBusy) bottomRef.current?.scrollIntoView({ block: 'end' }); }, [selectedId, messages.length]);

  async function sendMessage(event?: React.FormEvent) {
    event?.preventDefault();
    const active = clientRef.current;
    if (!active || !chosen || !isJoined || sending) return;
    try {
      const body = validateMessage(draft);
      setSending(true);
      setError('');
      if (editingTarget) {
        await active.sendEvent(chosen.roomId, sdk.EventType.RoomMessage, {
          msgtype: sdk.MsgType.Text, body: '* ' + body,
          'm.new_content': { msgtype: sdk.MsgType.Text, body },
          'm.relates_to': { rel_type: sdk.RelationType.Replace, event_id: editingTarget },
        });
      } else if (replyTarget?.eventId) {
        await active.sendEvent(chosen.roomId, sdk.EventType.RoomMessage, {
          msgtype: sdk.MsgType.Text, body,
          'm.relates_to': { 'm.in_reply_to': { event_id: replyTarget.eventId } },
        });
      } else {
        await active.sendTextMessage(chosen.roomId, body);
      }
      setReplyTarget(null);
      setEditingTarget(null);
      setDraft('');
      refresh(active);
    } catch (cause) { setError(cleanError(cause)); }
    finally { setSending(false); }
  }

  function editMyMessage(message: MatrixEvent) {
    if (message.getSender() !== session?.userId || message.isRedacted() || !message.getId()) return;
    setEditingTarget(message.getId()!);
    setReplyTarget(null);
    setDraft(messageText(message));
  }

  async function copyMessage(text: string) {
    if (!navigator.clipboard?.writeText) { setError('Clipboard is not available.'); return; }
    try { await navigator.clipboard.writeText(text); }
    catch { setError('Clipboard access was denied.'); }
  }

  async function sendReaction(eventId: string, emoji: string) {
    const active = clientRef.current;
    if (!active || !chosen || !isJoined || !eventId || eventBusy) return;
    setEventBusy(eventId);
    try {
      await active.sendEvent(chosen.roomId, sdk.EventType.Reaction, {
        'm.relates_to': { rel_type: sdk.RelationType.Annotation, event_id: eventId, key: emoji },
      });
      refresh(active);
    } catch (cause) { setError(cleanError(cause)); }
    finally { setEventBusy(null); }
  }

  async function removeMyMessage(eventId: string) {
    const active = clientRef.current;
    if (!active || !chosen || !isJoined || !eventId || eventBusy) return;
    if (!window.confirm('Remove this message for everyone? This action cannot be undone.')) return;
    setEventBusy(eventId);
    try { await active.redactEvent(chosen.roomId, eventId); refresh(active); }
    catch (cause) { setError(cleanError(cause)); }
    finally { setEventBusy(null); }
  }

  async function loadOlderMessages() {
    const active = clientRef.current;
    if (!active || !chosen || historyBusy || historyDone || status !== 'online') return;
    setHistoryBusy(true);
    try {
      await active.scrollback(chosen, 40);
      if (chosen.oldState.paginationToken === null) setHistoryDone(true);
      refresh(active);
    } catch (cause) { setError(cleanError(cause)); }
    finally { setHistoryBusy(false); }
  }

  function showModal(next: Exclude<Modal, null>) {
    if (!clientRef.current || status !== 'online') { setError('Connect to your homeserver before managing rooms.'); return; }
    setModalValue(''); setError(''); setModal(next);
  }

  async function submitModal(event: React.FormEvent) {
    event.preventDefault();
    const active = clientRef.current;
    if (!active || !modal || modalBusy) return;
    setModalBusy(true);
    setError('');
    try {
      if (modal === 'create') {
        const roomId = await createPrivateRoom(active, modalValue);
        setSelectedId(roomId);
      } else if (modal === 'join') {
        if (!modalValue.trim()) throw new Error('Enter a room ID or alias.');
        const room = await active.joinRoom(modalValue.trim());
        setSelectedId(room.roomId);
      } else if (modal === 'invite') {
        if (!chosen) throw new Error('Select a room first.');
        if (!validateUserId(modalValue)) throw new Error('Enter a valid Matrix user ID.');
        await active.invite(chosen.roomId, modalValue.trim());
      }
      refresh(active);
      setModal(null);
      setModalValue('');
    } catch (cause) { setError(cleanError(cause)); }
    finally { setModalBusy(false); }
  }

  async function acceptInvite() {
    if (!chosen || !client) return;
    try { await client.joinRoom(chosen.roomId); refresh(client); }
    catch (cause) { setError(cleanError(cause)); }
  }

  async function leaveRoom() {
    if (!chosen || !client || !window.confirm(`Leave ${chosen.name || 'this room'}?`)) return;
    try { await client.leave(chosen.roomId); refresh(client); }
    catch (cause) { setError(cleanError(cause)); }
  }

  async function signOut() {
    const active = clientRef.current;
    forgetSession();
    setSession(null);
    setClient(null);
    setRooms([]);
    setSelectedId(null);
    setError('');
    if (active) { try { await active.logout(); } catch { /* local session already cleared */ } active.stopClient(); }
  }

  if (!session) return <Login onPreview={onPreview} onLoggedIn={(data) => { setError(''); setSession(data); }} />;

  return <main className="app-shell">
    <aside className={`sidebar ${mobileSidebar ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header"><AppLogo /><button className="icon-button close-sidebar" onClick={() => setMobileSidebar(false)} aria-label="Close sidebar"><X size={19} /></button></div>
      <div className="sidebar-section-label">WORKSPACE <span className="workspace-pill">Personal</span></div>
      <div className="side-tools">
        <button className="side-tool selected" onClick={() => setFilter('')}><MessageCircle size={17} /> All conversations <span className="count">{rooms.length}</span></button>
        <button className="side-tool" onClick={() => showModal('join')}><Link2 size={17} /> Join a room <ArrowRight className="trailing" size={15} /></button>
      </div>
      <div className="sidebar-divider" />
      <div className="conversation-bar"><span>CONVERSATIONS</span><button className="icon-button" onClick={() => showModal('create')} title="New encrypted room" aria-label="New encrypted room"><Plus size={19} /></button></div>
      <label className="search-box"><Search size={16} /><input aria-label="Search rooms" placeholder="Search conversations" value={filter} onChange={(e) => setFilter(e.target.value)} /></label>
      <div className="room-list">
        {matches.length === 0 ? <div className="room-empty"><Inbox size={20} /><span>{filter ? 'No matching rooms' : 'No conversations yet'}</span></div> : matches.map((room) => {
          const latest = roomEvents(room).at(-1);
          const encrypted = Boolean(room.currentState.getStateEvents('m.room.encryption', ''));
          return <button key={room.roomId} className={`room-row ${selectedId === room.roomId ? 'room-active' : ''}`} onClick={() => { setSelectedId(room.roomId); setMobileSidebar(false); }}>
            <Avatar name={room.name || room.roomId} />
            <span className="room-row-content"><span className="room-row-top"><strong>{room.name || 'Unnamed room'}</strong>{encrypted && <LockKeyhole size={11} />}</span><small>{room.getMyMembership() === 'invite' ? 'Invitation received' : latest ? messageText(latest).slice(0, 68) : 'Start a conversation'}</small></span>
            {latest && <span className="room-timestamp"><Clock timestamp={latest.getTs()} /></span>}
          </button>;
        })}
      </div>
      <div className="sidebar-bottom">
        <button className="signout-btn" type="button" onClick={onPreview}><Sparkles size={16}/> Explore next-gen prototype</button>
        <div className="side-account"><Avatar name={session.userId} size="small" /><span><strong>{session.userId.split(':')[0]}</strong><small>{new URL(session.homeserver).host}</small></span><span className={`status-dot ${status}`} title={status} /></div>
        <button className="signout-btn" type="button" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </div>
    </aside>
    <section className="chat-main">
      <header className="chat-header">
        <div className="header-left"><button className="icon-button mobile-menu" onClick={() => setMobileSidebar(true)} aria-label="Open sidebar"><Menu size={21} /></button>{chosen ? <><Avatar name={chosen.name || chosen.roomId} size="small" /><span className="header-title"><strong>{chosen.name || 'Unnamed room'}</strong><small>{encryptionEnabled ? 'Encrypted conversation' : 'Encryption not enabled for this room'}</small></span></> : <span className="header-title"><strong>Welcome to Nexus</strong><small>Your communication space</small></span>}</div>
        <div className="header-actions">
          <span className={`connection-indicator ${status}`}>{status === 'offline' ? <WifiOff size={14} /> : <Wifi size={14} />}{status === 'online' ? 'Connected' : status === 'offline' ? 'Offline' : 'Connecting'}</span>
          {chosen && isJoined && <button className="icon-button" onClick={() => showModal('invite')} title="Invite user" aria-label="Invite to room"><UserPlus size={19} /></button>}
          {chosen && isJoined && <button className="btn btn-outline room-leave" onClick={leaveRoom}>Leave room</button>}
        </div>
      </header>
      {error && <div className="banner-error" role="alert">{error}<button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={15} /></button></div>}
      {!chosen ? <div className="empty-conversation"><div className="empty-illustration"><span><MessageCircle size={46} /></span><i className="orb orb-a" /><i className="orb orb-b" /></div><div className="eyebrow center"><span className="eyebrow-dot" /> YOUR SPACE, YOUR CONVERSATIONS</div><h2>Conversations begin here.</h2><p>Create an encrypted room or join an existing conversation on the Matrix network.</p><div className="empty-actions"><button className="btn btn-primary" onClick={() => showModal('create')}><Plus size={17} /> New private room</button><button className="btn btn-outline" onClick={() => showModal('join')}><Link2 size={17} /> Join room</button></div><div className="empty-security"><ShieldCheck size={15} /> Built on the open Matrix protocol</div></div> : <>
        <div className="room-toolbar"><span>{chosen.roomId}</span><button title="Copy room ID" className="toolbar-copy" onClick={() => { if (!navigator.clipboard?.writeText) { setError('Clipboard access is unavailable in this browser.'); return; } void navigator.clipboard.writeText(chosen.roomId).catch(() => setError('Clipboard access was denied.')); }}><Link2 size={14} /> Copy ID</button></div>
        {chosen.getMyMembership() === 'invite' ? <div className="invitation"><div className="invite-icon"><Users size={29} /></div><h2>You've been invited</h2><p>Join <strong>{chosen.name}</strong> to start messaging.</p><button className="btn btn-primary" onClick={acceptInvite}><Check size={16} /> Accept invitation</button></div> : <>
          <div className="messages" aria-label="Room messages">
            <div className="history-actions"><button className="btn btn-outline" type="button" onClick={() => void loadOlderMessages()} disabled={historyBusy || historyDone || status !== 'online'}><ChevronUp size={15}/>{historyBusy ? 'Loading older messages…' : historyDone ? 'Beginning of available history' : 'Load older messages'}</button></div>
            <div className="conversation-opening"><Avatar name={chosen.name || chosen.roomId} size="large" /><h2>{chosen.name}</h2><p>This is the beginning of this room's loaded history.</p>{encryptionEnabled ? <span><LockKeyhole size={13} /> Encryption enabled. Verify devices before trusting identities.</span> : <span className="unencrypted"><CircleHelp size={13} /> This room is not end-to-end encrypted.</span>}</div>
            {messages.map((message, index) => {
              const own = message.getSender() === session.userId;
              const sender = message.getSender() || 'Unknown sender';
              const eventId = message.getId();
              const replyToId = message.getContent()?.['m.relates_to']?.['m.in_reply_to']?.event_id;
              const replyTo = typeof replyToId === 'string' ? messages.find(e => e.getId() === replyToId) : undefined;
              const counts = eventId ? visibleReactionCounts[eventId] : undefined;
              return <div className={`message-row ${own ? 'message-own' : ''}`} key={eventId || `event-${index}`}><Avatar name={sender} size="small" /><div className="message-body"><div className="message-meta"><strong>{own ? 'You' : sender.split(':')[0]}</strong><Clock timestamp={message.getTs()} /></div><div className="message-bubble">{replyToId && <div className="message-reply-cite">↳ {replyTo ? messageText(replyTo).slice(0, 95) : 'Reply to an earlier message'}</div>}{message.isRedacted() ? 'Message removed' : messageText(message)}</div>{counts && <div className="reaction-list">{Object.entries(counts).map(([key,value])=><span className="reaction-pill" key={key}>{key} {value}</span>)}</div>}{!message.isRedacted() && eventId && <div className="message-actions"><button type="button" title="Reply to message" aria-label="Reply to message" onClick={() => { setReplyTarget({eventId, snippet: messageText(message).slice(0, 90)}); setEditingTarget(null); setDraft(''); }}><Reply size={14}/></button><button type="button" title="Copy message" aria-label="Copy message" onClick={() => void copyMessage(messageText(message))}><Copy size={14}/></button><button type="button" title="React with thumbs up" aria-label="React with thumbs up" disabled={eventBusy === eventId} onClick={() => void sendReaction(eventId, '👍')}><ThumbsUp size={14}/></button><button type="button" title="React with heart" aria-label="React with heart" disabled={eventBusy === eventId} onClick={() => void sendReaction(eventId, '❤️')}><Heart size={14}/></button>{own && <button type="button" title="Edit message" aria-label="Edit message" onClick={() => editMyMessage(message)}><Pencil size={14}/></button>}{own && <button type="button" title="Remove message for everyone" aria-label="Remove message for everyone" disabled={eventBusy === eventId} onClick={() => void removeMyMessage(eventId)}><Trash2 size={14}/></button>}</div>}</div></div>;
            })}
            <div ref={bottomRef} />
          </div>
          <div className="composer-area">{editingTarget && <div className="reply-preview"><span><Pencil size={15}/> Editing your message</span><button type="button" aria-label="Cancel editing" onClick={() => { setEditingTarget(null); setDraft(''); }}><X size={16}/></button></div>}{replyTarget && <div className="reply-preview"><span><Reply size={15}/> Replying to: {replyTarget.snippet}</span><button type="button" aria-label="Cancel reply" onClick={() => setReplyTarget(null)}><X size={16}/></button></div>}<form className="composer" onSubmit={sendMessage}><textarea aria-label="Write a message" disabled={sending} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendMessage(); } }} placeholder={`Message ${chosen.name || 'this room'}…`} rows={2} maxLength={10000} /><button type="submit" disabled={!draft.trim() || !client || sending} aria-label="Send message" className="send-button">{sending ? <LoaderCircle className="spin" size={19} /> : <Send size={18} />}</button></form><div className="composer-note"><span>Enter to send <span className="note-dot">·</span> Shift + Enter for a new line</span><span>{encryptionEnabled ? <><LockKeyhole size={12} /> E2EE enabled</> : 'Unencrypted room'}</span></div></div>
        </>}
      </>}
    </section>
    {mobileSidebar && <button className="sidebar-overlay" aria-label="Close sidebar" onClick={() => setMobileSidebar(false)} />}
    {modal && <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }} role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-label={modal === 'create' ? 'Create room' : modal === 'join' ? 'Join room' : 'Invite user'}><button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X size={20} /></button><div className="modal-symbol">{modal === 'create' ? <LockKeyhole size={23} /> : modal === 'join' ? <Link2 size={23} /> : <UserPlus size={23} />}</div><div className="card-kicker">NEXUS MESSENGER</div><h2>{modal === 'create' ? 'Start a private conversation' : modal === 'join' ? 'Join a Matrix room' : 'Invite someone to chat'}</h2><p>{modal === 'create' ? 'A new encrypted room will be created on your selected homeserver.' : modal === 'join' ? 'Paste a room ID or alias shared with you.' : 'Invite another Matrix user into this conversation.'}</p><form onSubmit={submitModal}><label htmlFor="modal-value">{modal === 'create' ? 'Room name' : modal === 'join' ? 'Room ID or alias' : 'Matrix user ID'}</label><div className="field"><Hash size={17} /><input id="modal-value" autoFocus value={modalValue} onChange={(e) => setModalValue(e.target.value)} required maxLength={modal === 'create' ? 100 : 500} placeholder={modal === 'create' ? 'Project team' : modal === 'join' ? '#team:example.org' : '@colleague:example.org'} /></div>{error && <div className="form-error" role="alert">{error}</div>}<button className="btn btn-primary modal-submit" type="submit" disabled={modalBusy}>{modalBusy ? <LoaderCircle className="spin" size={17} /> : modal === 'create' ? <>Create room <ArrowRight size={16} /></> : modal === 'join' ? <>Join conversation <ArrowRight size={16} /></> : <>Send invitation <ArrowRight size={16} /></>}</button></form></section></div>}
  </main>;
}
