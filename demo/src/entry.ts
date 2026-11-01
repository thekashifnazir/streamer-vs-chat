// OAuth returns to the registered root. consumeCallback persists the validated tab token;
// load the actual /play document, which restores it without another authorization.
const params=new URLSearchParams(location.hash.slice(1));
if(params.has('access_token')||params.has('error')||new URLSearchParams(location.search).has('error')){
  const status=document.querySelector('#entry-status .entry-text')??document.getElementById('entry-status');if(status)status.textContent='Connecting to Twitch…';
  let failed=false;
  try{const {getBrowserAuth}=await import('./twitch/auth');await getBrowserAuth().consumeCallback();try{sessionStorage.setItem('svc.twitch.fresh-login','1');}catch{/* Header wording only. */}}
  catch{failed=true;}
  location.replace(failed?'/play?oauthError=1':'/play');
}else if(!location.pathname.startsWith('/play')&&new URLSearchParams(location.search).get('lab')==='punch'){
  // Hidden punch-tuning page on the offline demo (not linked): camera and detectors only, no fight, no Twitch.
  const {mountPunchLab}=await import('./punch-lab');mountPunchLab(document);
}else{
  await import('./main');
  document.body.classList.remove('entry-loading');document.getElementById('entry-status')?.remove();
}

export {};
