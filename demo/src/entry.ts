// OAuth returns to the registered root. consumeCallback persists the validated tab token;
// load the actual /play document, which restores it without another authorization.
const params=new URLSearchParams(location.hash.slice(1));
if(params.has('access_token')||params.has('error')||new URLSearchParams(location.search).has('error')){
  let failed=false;
  try{const {getBrowserAuth}=await import('./twitch/auth');await getBrowserAuth().consumeCallback();}
  catch{failed=true;}
  location.replace(failed?'/play?oauthError=1':'/play');
}else{
  await import('./main');
}

export {};
