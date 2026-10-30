import type {Request as WorkerRequest} from '@cloudflare/workers-types';
import type {Env} from './env';
import {createWorkerRouter} from './router';
export {ChannelHub} from './channel';
const route=createWorkerRouter({fetch:(input,init)=>fetch(input,init),now:()=>Date.now()});
export default {fetch(request:WorkerRequest,env:Env){return route(request,{...env,ASSETS:{fetch:()=>env.ASSETS.fetch(request)}});}};
