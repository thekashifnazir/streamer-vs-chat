import type {BossDef} from './boss-def';
export type ForgeGateView={pass:boolean;viewers:number[];table:{casual:number[];nopunch:number[]};rounds:number;seed:number};
export type ForgeCallMetrics={operation:'moderation'|'generation'|'repair';model:string;latencyMs:number;inputTokens:number|null;outputTokens:number|null;costUsd:number|null};
export type ForgeSnapshot={betweenRounds:boolean;status:'idle'|'collecting'|'generating'|'validating'|'tuning'|'accepted'|'rejected'|'vetoed'|'unavailable';ideas:{id:string;idea:string;votes:number}[];idea:string|null;boss:BossDef|null;errors:string[];before:ForgeGateView|null;after:ForgeGateView|null;factor:number|null;ai:{model:'gpt-6-luna';latencyMs:number;inputTokens:number|null;outputTokens:number|null;costUsd:number|null;repair:boolean}|null};
