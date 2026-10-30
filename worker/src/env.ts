import type {WorkerEnv} from '../bindings';
/** Binding fields are generated from wrangler.toml; secrets exist only at runtime. */
export interface Env extends WorkerEnv {
 TWITCH_CLIENT_SECRET?:string;
 OPENAI_API_KEY?:string;
}
