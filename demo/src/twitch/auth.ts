import {setLiveCredentials} from '../credentials';
declare global {interface ImportMeta {readonly env:{readonly VITE_TWITCH_CLIENT_ID?:string}}}
/** Browser-only implicit flow. Only the CSRF nonce survives the redirect; tokens never persist. */
export type TwitchAccount={id:string;login:string;expiresIn:number;scopes:string[]};
export type NonceStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export class TwitchAuthError extends Error {constructor(){super('Twitch authorization expired or invalid. Connect again.');}}
const NONCE_KEY='svc.twitch.oauth-state';
export function createBrowserAuth(options:{clientId:string;redirectUri:string;fetch?:typeof fetch;storage?:NonceStorage;randomBytes?:(bytes:Uint8Array)=>Uint8Array;stripCallback?:(url:string)=>void}){
 const request=options.fetch??globalThis.fetch.bind(globalThis);
 const storage=options.storage??sessionStorage;
 let token:string|null=null,account:TwitchAccount|null=null;
 const clear=()=>{token=null;account=null;setLiveCredentials(false);};
 async function validate():Promise<TwitchAccount>{
  if(!token)throw new TwitchAuthError();
  const response=await request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`},cache:'no-store'});
  if(response.status===401){clear();throw new TwitchAuthError();}
  if(!response.ok)throw new Error('Twitch validation is unavailable. Try again.');
  const value=await response.json();
  if(value.client_id!==options.clientId||typeof value.user_id!=='string'||!value.user_id||typeof value.login!=='string'||!Array.isArray(value.scopes)||!value.scopes.includes('user:read:chat')||!Number.isFinite(value.expires_in)||value.expires_in<=0){clear();throw new TwitchAuthError();}
  account={id:value.user_id,login:value.login,expiresIn:value.expires_in,scopes:[...value.scopes]};return {...account,scopes:[...account.scopes]};
 }
 return {
  get account(){return account?{...account,scopes:[...account.scopes]}:null;},
  get hasToken(){return token!==null;},
  get authenticated(){return token!==null&&account!==null;},
  clear,validate,
  loginUrl(){
   if(!options.clientId)throw new Error('Twitch Client ID is not configured for this build.');
   const bytes=new Uint8Array(32);(options.randomBytes??(bytes=>crypto.getRandomValues(bytes)))(bytes);
   const state=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');storage.setItem(NONCE_KEY,state);
   const url=new URL('https://id.twitch.tv/oauth2/authorize');
   url.search=new URLSearchParams({client_id:options.clientId,redirect_uri:options.redirectUri,response_type:'token',scope:'user:read:chat channel:bot clips:edit',state}).toString();return url.href;
  },
  async consumeCallback(href=location.href):Promise<boolean>{
   const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1));
   if(!hash.has('access_token')&&!hash.has('error')&&!url.searchParams.has('error'))return false;
   const expected=storage.getItem(NONCE_KEY);storage.removeItem(NONCE_KEY);
   const state=hash.get('state')??url.searchParams.get('state'),received=hash.get('access_token');
   // Strip before validation/network work, including denied or malicious callbacks.
   url.hash='';for(const key of ['error','error_description','state'])url.searchParams.delete(key);
   (options.stripCallback??(url=>history.replaceState(null,'',url)))(url.href);
   clear();
   if(!expected||state!==expected||!received||hash.get('token_type')?.toLowerCase()!=='bearer')throw new TwitchAuthError();
   const redirect=new URL(options.redirectUri);
   if(url.origin!==redirect.origin||url.pathname!==redirect.pathname)throw new TwitchAuthError();
   token=received;setLiveCredentials(true);
   try{await validate();return true;}catch(error){clear();throw error;}
  },
  async backendRequest(path:string,init:RequestInit={}):Promise<Response>{
   if(!token||!account)throw new TwitchAuthError();
   // Deliberately fixed same-origin endpoint allowlist: no redirects can leak the user token.
   if(!/^\/api\/(results|status)$/.test(path))throw new Error('Invalid hosted API path');
   const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
   return request(path,{...init,headers,cache:'no-store',redirect:'error'});
  },
  async request(path:string,init:RequestInit={}):Promise<Response>{
   if(!token||!account)throw new TwitchAuthError();
   // Never attach credentials to a URL supplied by an event or UI.
   if(!path.startsWith('/')||path.startsWith('//'))throw new Error('Invalid Twitch API path');
   const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);headers.set('Client-Id',options.clientId);
   const response=await request(`https://api.twitch.tv/helix${path}`,{...init,headers,cache:'no-store'});
   if(response.status===401){clear();throw new TwitchAuthError();}return response;
  },
 };
}
export type BrowserAuth=ReturnType<typeof createBrowserAuth>;
let sharedAuth:BrowserAuth|undefined;
/** One memory session across same-document SPA route changes. Reload intentionally signs out. */
export function getBrowserAuth(config?:Parameters<typeof createBrowserAuth>[0]):BrowserAuth{
 if(!sharedAuth){
  sharedAuth=createBrowserAuth(config??{clientId:import.meta.env.VITE_TWITCH_CLIENT_ID??'',redirectUri:`${location.origin}/`});
 }
 return sharedAuth;
}
export function hasLiveToken():boolean{return sharedAuth?.hasToken??false;}
