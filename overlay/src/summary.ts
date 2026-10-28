import type { GameSummary } from '../../shared/src/highlights';
export type EndcardClip={id:string;label:string;url:string;status:'confirmed'};
/** Links are confirmed results only; external media is never fetched or embedded here. */
export function safeClipHref(value:string,base='http://localhost/'):string|null {
  try {
    const url=new URL(value,base);
    if(url.username||url.password)return null;
    if(url.protocol==='https:'&&(url.hostname==='clips.twitch.tv'||url.hostname==='www.twitch.tv'&&/^\/[^/]+\/clip\/[^/]+/.test(url.pathname)))return url.href;
    return null;
  } catch{return null;}
}
export function summaryPresentation(summary:GameSummary,clips:EndcardClip[],base='http://localhost/') {
  const seen=new Set<string>();
  const links=clips.flatMap(clip=>{
    if(clip.status!=='confirmed'||seen.has(clip.id))return [];
    const href=safeClipHref(clip.url,base);if(!href)return [];
    seen.add(clip.id);return [{...clip,url:href}];
  }).slice(0,3);
  return {
    heading:summary.round===null?'MATCH RESULTS':`ROUND ${summary.round} RESULTS`,
    winner:summary.winner===null?'RESULTS':summary.winner==='streamer'?'STREAMER WINS':'CHAT GOLEM WINS',
    score:`STREAMER ${summary.roundWins.streamer} – ${summary.roundWins.boss} CHAT`,
    defence:`${summary.stats.defended} / ${summary.stats.attacks} DEFENDED`,
    outcomes:`${summary.stats.perfects} PERFECT · ${summary.stats.blocks} BLOCK · ${summary.stats.dodges} DODGE`,
    damage:`${Math.round(summary.stats.damageDealt)} DEALT · ${Math.round(summary.stats.damageTaken)} TAKEN`,
    reaction:summary.stats.reactionMs===null?'NO REACTED DEFENCES':`${Math.round(summary.stats.reactionMs)} ms · REACTED DEFENCES ONLY`,
    mvp:summary.chatMvp?`${summary.chatMvp.displayName??summary.chatMvp.user} · ${summary.chatMvp.damage.toFixed(1)} DAMAGE`:'NO CHAT MVP · AUTOPILOT / NO ATTRIBUTED DAMAGE',
    links,
  };
}
export function createSummaryView(host:HTMLElement) {
  let signature='';
  return {
    render(summary:GameSummary|null,clips:EndcardClip[]=[]) {
      host.hidden=!summary;if(!summary){signature='';return;}
      const view=summaryPresentation(summary,clips,location.href);
      const next=JSON.stringify(view);if(next===signature)return;signature=next;
      host.replaceChildren();
      const text=(tag:string,value:string,className?:string)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;host.append(node);return node;};
      text('p',view.heading,'eyebrow');text('h2',view.winner);text('p',view.score,'summary-score');
      const stats=document.createElement('div');stats.className='summary-stats';host.append(stats);
      for(const [label,value]of [['DEFENCE',view.defence],['CLEAN DEFENCES',view.outcomes],['DAMAGE',view.damage],['REACTION',view.reaction],['CHAT MVP',view.mvp]]) {
        const section=document.createElement('div'),title=document.createElement('h3'),detail=document.createElement('p');title.textContent=label!;detail.textContent=value!;section.append(title,detail);stats.append(section);
      }
      text('h3','TOP MOMENTS');
      if(!view.links.length)text('p','Stats only · no confirmed clip available.','summary-empty');
      else {
        const list=document.createElement('ol');host.append(list);
        for(const clip of view.links){const item=document.createElement('li'),link=document.createElement('a');link.textContent=clip.label;link.href=clip.url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);list.append(item);}
      }
    },
  };
}
