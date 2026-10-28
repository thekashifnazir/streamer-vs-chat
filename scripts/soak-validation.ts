export function matchIssues(game:any):string[]{
 const issues:string[]=[];const winner=game?.matchWinner,rounds=game?.roundResults,wins=game?.roundWins;
 if(!['streamer','boss'].includes(winner)||game?.roundOver!==true||!Array.isArray(rounds)||!wins)return ['missing completed-match evidence'];
 if(!Number.isInteger(wins.streamer)||!Number.isInteger(wins.boss)||wins.streamer<0||wins.boss<0)issues.push('invalid score values');
 if(wins[winner]!==2||wins[winner==='boss'?'streamer':'boss']>=2||rounds.length<2||rounds.length>3)issues.push('invalid best-of-three score');
 const counted={streamer:0,boss:0};
 rounds.forEach((round:any,index:number)=>{
  if(!round||typeof round!=='object'){issues.push('invalid round identity/result');return;}
  if(counted.streamer===2||counted.boss===2)issues.push('round after match already decided');
  if(round.number!==index+1||!['streamer','boss'].includes(round.winner)||!['ko','timeout'].includes(round.reason))issues.push('invalid round identity/result');
  else counted[round.winner as keyof typeof counted]++;
  const a=round.streamer_hp,b=round.boss_hp;
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||a>100||b<0||b>135)issues.push('invalid result HP');
  if(round.reason==='ko'&&(round.winner==='boss'?a!==0:b!==0))issues.push('KO without defeated HP zero');
  if(round.reason==='timeout'&&round.winner!==(a/100>=b/135?'streamer':'boss'))issues.push('timeout winner inconsistent with HP percentages');
 });
 if(counted.streamer!==wins.streamer||counted.boss!==wins.boss)issues.push('round score mismatch');
 const last=rounds.at(-1);if(last?.winner!==winner)issues.push('final winner mismatch');if(last&&(last.streamer_hp!==game.streamerHp||last.boss_hp!==game.bossHp))issues.push('final HP mismatch');
 return issues;
}
