import {isClipId} from './clip-results.js';
/** App credentials remain in isolate memory only; upstream response bodies are never logged. */
export interface AppCredentials { clientId:string; clientSecret:string; botUserId:string }
export interface ChatSendResult { dropReason:string|null }
export type Fetcher = (input:string|URL|Request, init?:RequestInit)=>Promise<Response>;
export function safeDropReason(value:unknown):string|null {
  return typeof value==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : null;
}
export class TwitchBotSender {
  private cached:{token:string; refreshAt:number}|null=null;
  private loading:Promise<string>|null=null;
  constructor(private credentials:AppCredentials,private fetcher:Fetcher,private now:()=>number) {}
  private async token():Promise<string> {
    if(this.cached && this.now()<this.cached.refreshAt)return this.cached.token;
    if(this.loading)return this.loading;
    this.loading=this.loadToken();
    try{return await this.loading;}finally{this.loading=null;}
  }
  private async loadToken():Promise<string> {
    const body=new URLSearchParams({client_id:this.credentials.clientId,client_secret:this.credentials.clientSecret,grant_type:'client_credentials'});
    const response=await this.fetcher('https://id.twitch.tv/oauth2/token',{method:'POST',body,redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(response.type==='opaqueredirect'||response.status>=300&&response.status<400||!response.ok)throw new Error('app-token-unavailable');
    const data:unknown=await response.json();
    if(!data || typeof data!=='object' || !('access_token' in data) || typeof data.access_token!=='string' || !data.access_token || !('expires_in' in data) || typeof data.expires_in!=='number' || !Number.isFinite(data.expires_in) || data.expires_in<=0)throw new Error('app-token-invalid');
    this.cached={token:data.access_token,refreshAt:this.now()+Math.max(0,data.expires_in-60)*1000};
    return data.access_token;
  }
  private configured():void {
    if(!this.credentials.clientId.trim() || !this.credentials.clientSecret.trim() || !/^[0-9]{1,30}$/.test(this.credentials.botUserId))throw new Error('bot-not-configured');
  }
  /** Resolve only a Twitch-confirmed clip owned by the authenticated channel, never a submitted URL. */
  async clipUrl(channel:string,clipId:string):Promise<string|null> {
    this.configured();
    if(!/^[0-9]{1,30}$/.test(channel) || !isClipId(clipId))return null;
    for(let attempt=0;attempt<2;attempt++){
      const token=await this.token();
      const response=await this.fetcher(`https://api.twitch.tv/helix/clips?id=${encodeURIComponent(clipId)}`,{headers:{Authorization:`Bearer ${token}`,'Client-Id':this.credentials.clientId},redirect:'manual',signal:AbortSignal.timeout(8000)});
      if(response.type==='opaqueredirect'||response.status>=300&&response.status<400)throw new Error('clip-unavailable');
      if(response.status===401 && attempt===0){this.cached=null;continue;}
      if(!response.ok)throw new Error('clip-unavailable');
      const payload:unknown=await response.json();
      const first=payload && typeof payload==='object' && 'data' in payload && Array.isArray(payload.data)?payload.data[0]:null;
      if(!first || typeof first!=='object' || !('id' in first) || first.id!==clipId || !('broadcaster_id' in first) || first.broadcaster_id!==channel)return null;
      return `https://clips.twitch.tv/${clipId}`;
    }
    throw new Error('clip-unavailable');
  }
  async send(channel:string,message:string):Promise<ChatSendResult> {
    this.configured();
    for(let attempt=0;attempt<2;attempt++) {
      const token=await this.token();
      const response=await this.fetcher('https://api.twitch.tv/helix/chat/messages',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Client-Id':this.credentials.clientId,'Content-Type':'application/json'},body:JSON.stringify({broadcaster_id:channel,sender_id:this.credentials.botUserId,message,for_source_only:true}),redirect:'manual',signal:AbortSignal.timeout(8000)});
      if(response.type==='opaqueredirect')return {dropReason:'invalid_response'};
      if(response.status===401 && attempt===0){this.cached=null;continue;}
      if(response.status===403){
        // Most 403s have only an error summary; retain a structured code if supplied, never its text.
        const body:unknown=await response.json().catch(()=>null);
        const first=body && typeof body==='object' && 'data' in body && Array.isArray(body.data)?body.data[0]:null;
        const reason=first && typeof first==='object' && 'drop_reason' in first && first.drop_reason && typeof first.drop_reason==='object' && 'code' in first.drop_reason?first.drop_reason.code:null;
        return {dropReason:safeDropReason(reason)??'forbidden'};
      }
      if(response.status>=300&&response.status<400||!response.ok)return {dropReason:`http_${response.status}`};
      const payload:unknown=await response.json();
      const first=payload && typeof payload==='object' && 'data' in payload && Array.isArray(payload.data) ? payload.data[0] : null;
      if(!first || typeof first!=='object' || !('is_sent' in first))return {dropReason:'invalid_response'};
      if(first.is_sent===true)return {dropReason:null};
      const reason='drop_reason' in first && first.drop_reason && typeof first.drop_reason==='object' && 'code' in first.drop_reason ? first.drop_reason.code : null;
      return {dropReason:safeDropReason(reason)??'not_sent'};
    }
    return {dropReason:'unauthorized'};
  }
}
