import {setLiveCredentials} from '../credentials';
declare global {interface ImportMeta {readonly env:{readonly VITE_TWITCH_CLIENT_ID?:string}}}
/** Browser-only implicit flow. Credentials survive reload only in this tab's sessionStorage. */
export type TwitchAccount={id:string;login:string;expiresIn:number;scopes:string[]};
export type NonceStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export class TwitchAuthError extends Error {constructor(){super('Twitch authorization expired or invalid. Connect again.');}}
const NONCE_KEY='svc.twitch.oauth-state';
const TOKEN_KEY='svc.twitch.access-token';
export function createBrowserAuth(options:{clientId:string;redirectUri:string;fetch?:typeof fetch;storage?:NonceStorage;randomBytes?:(bytes:Uint8Array)=>Uint8Array;stripCallback?:(url:string)=>void}){
 const request=options.fetch??globalThis.fetch.bind(globalThis);
 const storage=()=>options.storage??globalThis.sessionStorage;
 const read=(key:string)=>{try{return storage().getItem(key);}catch{return null;}};
 const remove=(key:string)=>{try{storage().removeItem(key);}catch{/* Storage restrictions must not block disconnect. */}};
 const save=(key:string,value:string)=>{try{storage().setItem(key,value);return true;}catch{return false;}};
 let token:string|null=null,account:TwitchAccount|null=null,restored=false,generation=0;
 const clear=()=>{generation++;token=null;account=null;restored=false;remove(TOKEN_KEY);setLiveCredentials(false);};
 async function validate():Promise<TwitchAccount>{
  const current=generation,credential=token;
  try{
  if(!token)throw new TwitchAuthError();
  const response=await request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`},cache:'no-store'});
  if(response.status===401)throw new TwitchAuthError();
  if(!response.ok)throw new Error('Twitch validation is unavailable. Try again.');
  const value=await response.json();
  if(current!==generation||credential!==token)throw new TwitchAuthError();
  if(value.client_id!==options.clientId||typeof value.user_id!=='string'||!value.user_id||typeof value.login!=='string'||!Array.isArray(value.scopes)||!value.scopes.includes('user:read:chat')||!Number.isFinite(value.expires_in)||value.expires_in<=0)throw new TwitchAuthError();
  account={id:value.user_id,login:value.login,expiresIn:value.expires_in,scopes:[...value.scopes]};return {...account,scopes:[...account.scopes]};
  }catch(error){if(current===generation&&credential===token)clear();throw error;}
 }
 return {
  get account(){return account?{...account,scopes:[...account.scopes]}:null;},
  get hasToken(){return token!==null;},
  get restored(){return restored;},
  get authenticated(){return token!==null&&account!==null;},
  clear,validate,
  async restore():Promise<boolean>{
   if(token&&account)return true;
   const saved=read(TOKEN_KEY);
   if(!saved)return false;
   generation++;token=saved;account=null;restored=false;setLiveCredentials(true);const current=generation;
   try{await validate();if(current!==generation)return false;restored=true;return true;}catch{return false;}
  },
  loginUrl(extraScopes:string[]=[]){
   if(!options.clientId)throw new Error('Twitch Client ID is not configured for this build.');
   const bytes=new Uint8Array(32);(options.randomBytes??(bytes=>crypto.getRandomValues(bytes)))(bytes);
   const state=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');if(!save(NONCE_KEY,state))throw new Error('Twitch authorization needs session storage enabled in this tab.');
   const url=new URL('https://id.twitch.tv/oauth2/authorize');
   url.search=new URLSearchParams({client_id:options.clientId,redirect_uri:options.redirectUri,response_type:'token',scope:[...new Set(['user:read:chat','channel:bot','clips:edit',...extraScopes.filter(scope=>scope==='channel:read:stream_key')])].join(' '),state}).toString();return url.href;
  },
  async consumeCallback(href=location.href):Promise<boolean>{
   const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1));
   if(!hash.has('access_token')&&!hash.has('error')&&!url.searchParams.has('error'))return false;
   const expected=read(NONCE_KEY);remove(NONCE_KEY);
   const state=hash.get('state')??url.searchParams.get('state'),received=hash.get('access_token');
   // Strip before validation/network work, including denied or malicious callbacks.
   url.hash='';for(const key of ['error','error_description','state'])url.searchParams.delete(key);
   (options.stripCallback??(url=>history.replaceState(null,'',url)))(url.href);
   clear();
   if(!expected||state!==expected||!received||hash.get('token_type')?.toLowerCase()!=='bearer')throw new TwitchAuthError();
   const redirect=new URL(options.redirectUri);
   if(url.origin!==redirect.origin||url.pathname!==redirect.pathname)throw new TwitchAuthError();
   token=received;setLiveCredentials(true);const current=generation;
   await validate();if(current!==generation)throw new TwitchAuthError();save(TOKEN_KEY,received);return true;
  },
  async backendRequest(path:string,init:RequestInit={}):Promise<Response>{
   if(!token||!account)throw new TwitchAuthError();
   // Deliberately fixed same-origin endpoint allowlist: no redirects can leak the user token.
   if(!/^\/api\/(results|status|forge\/(?:moderate|respond)|memory\/events|memory\/snapshot\?sessionId=[A-Za-z0-9:_-]{1,100}(?:&mvpId=[0-9]{1,30})?)$/.test(path))throw new Error('Invalid hosted API path');
   const current=generation;
   const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
   const response=await request(path,{...init,headers,cache:'no-store',redirect:'error'});
   if(response.status===401){if(current===generation)clear();throw new TwitchAuthError();}return response;
  },
  async request(path:string,init:RequestInit={}):Promise<Response>{
   if(!token||!account)throw new TwitchAuthError();
   // Never attach credentials to a URL supplied by an event or UI.
   if(!path.startsWith('/')||path.startsWith('//'))throw new Error('Invalid Twitch API path');
   const current=generation;
   const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);headers.set('Client-Id',options.clientId);
   const response=await request(`https://api.twitch.tv/helix${path}`,{...init,headers,cache:'no-store'});
   if(response.status===401){if(current===generation)clear();throw new TwitchAuthError();}return response;
  },
 };
}
export type BrowserAuth=ReturnType<typeof createBrowserAuth>;
let sharedAuth:BrowserAuth|undefined;
/** One auth instance across same-document routes; /play explicitly validates a tab-stored token on reload. */
export function getBrowserAuth(config?:Parameters<typeof createBrowserAuth>[0]):BrowserAuth{
 if(!sharedAuth){
  sharedAuth=createBrowserAuth(config??{clientId:import.meta.env.VITE_TWITCH_CLIENT_ID??'',redirectUri:`${location.origin}/`});
 }
 return sharedAuth;
}
export function hasLiveToken():boolean{return sharedAuth?.hasToken??false;}
