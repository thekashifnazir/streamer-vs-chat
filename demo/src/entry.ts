// OAuth returns to the registered root. Keep the token in this document's memory
// while switching to /play; /play also validates tab-scoped credentials on reload.
const params=new URLSearchParams(location.hash.slice(1));
if(params.has('access_token')||params.has('error')||new URLSearchParams(location.search).has('error')){
  let failed=false;
  try{const {getBrowserAuth}=await import('./twitch/auth');await getBrowserAuth().consumeCallback();}
  catch{failed=true;}
  history.replaceState({oauthError:failed},'', '/play');
}
await import('./main');

export {};
