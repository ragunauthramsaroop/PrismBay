// Encrypted, browser-local vault. Never send or persist the passphrase.
const KEY="prismbay.vault.v1",enc=new TextEncoder(),dec=new TextDecoder();
const b64=x=>btoa(Array.from(x,b=>String.fromCharCode(b)).join(""));
const bytes=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
async function derive(pass,salt){const material=await crypto.subtle.importKey("raw",enc.encode(pass),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
export async function seal(notes,pass){if(typeof pass!=="string"||pass.length<12)throw Error("Use a passphrase of at least 12 characters.");const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(pass,salt),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(notes)));return JSON.stringify({v:1,salt:b64(salt),iv:b64(iv),cipher:b64(new Uint8Array(cipher))});}
export async function unseal(raw,pass){const x=JSON.parse(raw);if(x.v!==1||typeof x.cipher!=="string"||raw.length>3000000)throw Error("Invalid vault backup.");const salt=bytes(x.salt),iv=bytes(x.iv);if(salt.length!==16||iv.length!==12)throw Error("Invalid vault backup.");const key=await derive(pass,salt);const notes=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv},key,bytes(x.cipher))));if(!Array.isArray(notes)||notes.length>100||notes.some(n=>typeof n.id!=="string"||typeof n.title!=="string"||typeof n.body!=="string"||n.title.length>150||n.body.length>16000))throw Error("Invalid notes.");return notes;}
export const exists=()=>localStorage.getItem(KEY)!==null;
export async function load(pass){const x=localStorage.getItem(KEY);return x?unseal(x,pass):[];}
export async function save(notes,pass){if(notes.length>100)throw Error("Vault limit: 100 notes.");localStorage.setItem(KEY,await seal(notes,pass));}
export const backup=()=>localStorage.getItem(KEY);
export async function restore(raw,pass){const notes=await unseal(raw,pass);localStorage.setItem(KEY,raw);return notes;}
export const erase=()=>localStorage.removeItem(KEY);
export function find(notes,q){const terms=q.toLowerCase().split(/\s+/).filter(Boolean);return notes.filter(n=>terms.every(t=>(n.title+" "+n.body).toLowerCase().includes(t)));}
