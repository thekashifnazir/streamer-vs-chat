/** Shared SPA memory only. Never stores token text or writes browser storage. */
let liveCredentials=false;
export function hasLiveCredentials(){return liveCredentials;}
export function setLiveCredentials(value:boolean){liveCredentials=value;}
