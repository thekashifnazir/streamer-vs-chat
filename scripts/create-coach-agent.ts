// Creates (or, with COACH_AGENT_ID set, updates) the private ElevenLabs "Corner coach" agent.
//   set -a; . /path/to/.env; set +a; npx tsx scripts/create-coach-agent.ts
// Needs ELEVENLABS_API_KEY with ElevenLabs Agents access. Prints ONLY the agent id (not a secret).
// Optional: COACH_VOICE_ID (default: George, a warm premade voice). Each run edits a real agent; no audio is spent.
import {pathToFileURL} from 'node:url';
import {COACH_BASE_PROMPT,COACH_FIRST_MESSAGE,COACH_MAX_SECONDS} from '../demo/src/coach-prompt.js';
export const DEFAULT_COACH_VOICE='JBFqnCBsd6RMkjVDRZzb';
/** Per-session overrides are limited to prompt and first message; auth makes a Worker-minted token mandatory. */
export function coachAgentBody(voiceId=DEFAULT_COACH_VOICE){return {
 name:'Streamer vs Chat · Corner coach',
 conversation_config:{agent:{first_message:COACH_FIRST_MESSAGE,language:'en',prompt:{prompt:`${COACH_BASE_PROMPT}\n\nEach session adds the current fight numbers after this text.`}},tts:{voice_id:voiceId},conversation:{max_duration_seconds:COACH_MAX_SECONDS}},
 platform_settings:{auth:{enable_auth:true},overrides:{conversation_config_override:{agent:{prompt:{prompt:true},first_message:true,language:false},tts:{voice_id:false}}},call_limits:{agent_concurrency_limit:5,daily_limit:200}},
};}
export async function createCoachAgent(options:{key:string;agentId?:string;voiceId?:string;fetch?:typeof fetch}):Promise<string>{
 const request=options.fetch??fetch,update=!!options.agentId;
 const url=update?`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(options.agentId!)}`:'https://api.elevenlabs.io/v1/convai/agents/create';
 const response=await request(url,{method:update?'PATCH':'POST',headers:{'xi-api-key':options.key,'Content-Type':'application/json'},body:JSON.stringify(coachAgentBody(options.voiceId||undefined)),signal:AbortSignal.timeout(30000)});
 const text=await response.text();
 // Never echo the key, even if an upstream error quotes it.
 if(!response.ok)throw new Error(`ElevenLabs ${response.status}: ${text.slice(0,600).replaceAll(options.key,'[key]')}`);
 const id=update?options.agentId!:(JSON.parse(text) as {agent_id?:unknown}).agent_id;
 if(typeof id!=='string'||!/^[\w-]{1,64}$/.test(id))throw new Error('ElevenLabs reply had no agent_id');
 return id;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const key=process.env.ELEVENLABS_API_KEY?.trim();
 if(!key){console.error('Set ELEVENLABS_API_KEY first (never commit it).');process.exit(1);}
 try{console.log(await createCoachAgent({key,agentId:process.env.COACH_AGENT_ID?.trim()||undefined,voiceId:process.env.COACH_VOICE_ID?.trim()}));}
 catch(error){console.error(error instanceof Error?error.message:'create-coach-agent failed');process.exit(1);}
}
