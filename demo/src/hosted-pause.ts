/** UI-only hold detector. Receive time and fresh framing gate every sample. */
export function createGuardResume(resume:()=>void){
 let since:number|null=null;
 return {reset(){since=null;},sample(eligible:boolean,guard:boolean,now:number){
  if(!eligible||!guard){since=null;return;}
  since??=now;if(now-since>=1000){since=null;resume();}
 }};
}
