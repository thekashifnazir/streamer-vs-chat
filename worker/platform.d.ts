/** Importable platform types avoid merging Workers' HTMLRewriter DOM into Chrome's DOM. */
type Fetcher=import('@cloudflare/workers-types').Fetcher;
type DurableObjectNamespace<T extends import('@cloudflare/workers-types').Rpc.DurableObjectBranded|undefined=undefined>=import('@cloudflare/workers-types').DurableObjectNamespace<T>;
declare module 'cloudflare:workers' {
 export const DurableObject:typeof import('@cloudflare/workers-types').CloudflareWorkersModule.DurableObject;
}
