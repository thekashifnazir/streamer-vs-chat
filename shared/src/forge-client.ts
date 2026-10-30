export type ForgeResponse={id?:string;status?:string;output_text?:string;output?:{type?:string;content?:{type?:string;text?:string;refusal?:string}[]}[];usage?:{input_tokens?:number;output_tokens?:number;input_tokens_details?:{cached_tokens?:number}}};
export type ForgeResponseRequest={model:'gpt-6-luna';reasoning:{effort:'low'};store:false;max_output_tokens:number;text:{format:{type:'json_schema';name:'boss_def';schema:unknown;strict:true}};input:{role:'system'|'user'|'assistant';content:string}[]};
export type ForgeClient={moderations:{create:(body:{model:'omni-moderation-latest';input:string[]},options:{signal:AbortSignal})=>Promise<{results:{flagged:boolean}[]}>};responses:{create:(body:ForgeResponseRequest,options:{signal:AbortSignal})=>Promise<ForgeResponse>}};

/** Only this known status may cross the hosted boundary into the Forge HUD. */
export class ForgeDailyCapError extends Error {constructor(){super('daily cap reached');this.name='ForgeDailyCapError';}}
