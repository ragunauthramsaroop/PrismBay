import * as sdk from 'matrix-js-sdk';
import { normalizeHomeserver, validateUserId } from './domain.mjs';

export interface Session {
  homeserver: string;
  accessToken: string;
  userId: string;
  deviceId: string;
}

const SESSION_KEY = 'nexus-messenger-session-v1';
const HOMESERVER_KEY = 'nexus-messenger-homeserver-v1';

export function getPreferredHomeserver(): string {
  try { return localStorage.getItem(HOMESERVER_KEY) || 'https://matrix.org'; }
  catch { return 'https://matrix.org'; }
}

export function getStoredSession(): Session | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Session;
    if (!parsed || typeof parsed.accessToken !== 'string' || !parsed.accessToken ||
        typeof parsed.deviceId !== 'string' || !parsed.deviceId || !validateUserId(parsed.userId)) return null;
    parsed.homeserver = normalizeHomeserver(parsed.homeserver);
    return parsed;
  } catch { return null; }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  try { localStorage.setItem(HOMESERVER_KEY, session.homeserver); } catch { /* optional preference */ }
}

export function forgetSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function signIn(homeserver: string, userId: string, password: string): Promise<Session> {
  const baseUrl = normalizeHomeserver(homeserver);
  if (!validateUserId(userId)) throw new Error('Enter your Matrix ID, for example @alex:example.org.');
  if (!password) throw new Error('Enter your password.');
  const transientClient = sdk.createClient({ baseUrl });
  try {
    const response = await transientClient.loginWithPassword(userId.trim(), password);
    if (!response.access_token || !response.user_id || !response.device_id) {
      throw new Error('Your homeserver returned an incomplete login response.');
    }
    return {
      homeserver: baseUrl,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id,
    };
  } finally {
    transientClient.stopClient();
  }
}

export function createSessionClient(session: Session): sdk.MatrixClient {
  return sdk.createClient({
    baseUrl: session.homeserver,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
  });
}

/** Creates an encrypted room. Key backup and cross-signing are not yet configured in this MVP. */
export async function createPrivateRoom(client: sdk.MatrixClient, name: string): Promise<string> {
  const roomName = name.trim();
  if (!roomName || roomName.length > 100) throw new Error('Room name must be 1–100 characters.');
  const response = await client.createRoom({
    name: roomName,
    visibility: sdk.Visibility.Private,
    preset: sdk.Preset.PrivateChat,
    initial_state: [{
      type: 'm.room.encryption',
      state_key: '',
      content: { algorithm: 'm.megolm.v1.aes-sha2' },
    }],
  });
  return response.room_id;
}
