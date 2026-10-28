/** Session-local inference only: Twitch chat does not identify raid membership. */
export class RaidTracker {
  private seen=new Set<string>();
  private raid:{at:number;admitUntil:number;capacity:number;members:Set<string>}|null=null;
  start(viewers:number,at:number):void {
    if(!Number.isSafeInteger(viewers)||viewers<0||!Number.isFinite(at))return;
    this.raid={at,admitUntil:at+120000,capacity:viewers,members:new Set()};
  }
  observe(user:string,at:number):boolean {
    if(!user)return false;
    if(!this.seen.has(user)) {
      this.seen.add(user);
      const raid=this.raid;
      if(raid&&at>=raid.at&&at<raid.admitUntil&&raid.members.size<raid.capacity)raid.members.add(user);
    }
    return this.raid?.members.has(user)??false;
  }
}
