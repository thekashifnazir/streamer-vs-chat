import {expect,it,vi} from 'vitest';
import {coachAgentBody,createCoachAgent} from './create-coach-agent';
it('creates a private 60 s agent with prompt/first-message overrides only, and updates by id',async()=>{
 const body=coachAgentBody();expect(body.conversation_config.conversation.max_duration_seconds).toBe(60);expect(body.platform_settings.auth.enable_auth).toBe(true);expect(body.platform_settings.overrides.conversation_config_override.tts.voice_id).toBe(false);
 const fetcher=vi.fn(async()=>Response.json({agent_id:'agent_new1'}));expect(await createCoachAgent({key:'k',fetch:fetcher})).toBe('agent_new1');
 expect(fetcher).toHaveBeenCalledWith('https://api.elevenlabs.io/v1/convai/agents/create',expect.objectContaining({method:'POST',headers:{'xi-api-key':'k','Content-Type':'application/json'}}));
 const patch=vi.fn(async()=>Response.json({}));expect(await createCoachAgent({key:'k',agentId:'agent_old',fetch:patch})).toBe('agent_old');expect(patch).toHaveBeenCalledWith('https://api.elevenlabs.io/v1/convai/agents/agent_old',expect.objectContaining({method:'PATCH'}));
});
it('reports the upstream error without the key',async()=>{
 await expect(createCoachAgent({key:'sk_secret',fetch:async()=>new Response('{"detail":"key sk_secret lacks convai_write"}',{status:401})})).rejects.toThrow('ElevenLabs 401: {"detail":"key [key] lacks convai_write"}');
});
