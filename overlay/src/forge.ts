import type {ForgeSnapshot} from '../../shared/src/forge-view';
export function forgePresentation(value:ForgeSnapshot|null){
 if(!value)return null;
 const table=(gate:ForgeSnapshot['before'])=>gate?gate.viewers.map((viewers,index)=>`${viewers}: ${Math.round(gate.table.casual[index]!)}% casual / ${Math.round(gate.table.nopunch[index]!)}% no-punch`).join(' · '):'Not measured';
 const ai=value.ai?`AI: ${value.ai.model} · ${(value.ai.latencyMs/1000).toFixed(2)}s · ${value.ai.costUsd===null?'cost unavailable':`$${value.ai.costUsd.toFixed(5)}`}`:'';
 const rates=(index:number,kind:'casual'|'nopunch')=>`${value.before?`${Math.round(value.before.table[kind][index]!)}%`:'—'} → ${value.after?`${Math.round(value.after.table[kind][index]!)}%`:'—'}`;
 const rows=(value.before??value.after)?.viewers.map((viewers,index)=>({viewers,casual:rates(index,'casual'),nopunch:rates(index,'nopunch')}))??[];
 return {rows,status:value.status.toUpperCase(),idea:value.idea??value.ideas.map(item=>`${item.idea} (${item.votes})`).join(' · '),name:value.boss?.name??'BOSS FORGE',tagline:value.boss?.tagline??'',moves:value.boss?.moves.map(move=>`${move.command} · ${move.label} · ${move.defence.replaceAll('_',' ')} · ${move.damage}×${move.hits} / chip ${move.chip} · ${move.telegraph_ms}ms`)??[],validation:value.errors.length?`✕ ${value.errors.join(' ')}`:value.boss?'✓ VALIDATED':'Awaiting validation',before:table(value.before),after:table(value.after),factor:value.factor===null?'':`DAMAGE ×${value.factor.toFixed(2)}`,ai};
}
/** Between-rounds presentation only. Text is never interpreted as markup. */
export function createForgeView(host:HTMLElement){
 let last='';
 host.classList.add('forge-card');host.setAttribute('aria-label','Boss Forge');host.setAttribute('aria-live','polite');
 return {render(snapshot:ForgeSnapshot|null,visible:boolean){const signature=JSON.stringify([snapshot,visible]);if(signature===last)return;last=signature;const view=forgePresentation(snapshot);host.hidden=!visible||!view||snapshot?.status==='idle';host.replaceChildren();if(host.hidden||!view)return;
 const line=(tag:string,text:string)=>{if(!text)return;const node=document.createElement(tag);node.textContent=text;host.append(node);};
 line('h2',view.name);line('p',`BOSS FORGE · ${view.status}`);line('p',view.idea);line('p',view.tagline);for(const move of view.moves)line('p',move);line('p',view.validation);if(view.rows.length){const table=document.createElement('table');const caption=document.createElement('caption');caption.textContent=`WIN RATE · BEFORE → AFTER · ${snapshot?.before?.rounds??snapshot?.after?.rounds} rounds / cell`;table.append(caption);const header=table.createTHead().insertRow();for(const title of ['VIEWERS','CASUAL','NO PUNCH']){const th=document.createElement('th');th.textContent=title;header.append(th);}const body=table.createTBody();for(const row of view.rows){const tr=body.insertRow();for(const text of [String(row.viewers),row.casual,row.nopunch]){const td=tr.insertCell();td.textContent=text;}}host.append(table);}else line('p','Balance: not measured');if(snapshot?.after)line('p',`${view.factor} · ${snapshot.after.pass?'✓ ALL GATES PASS':'✕ BALANCE REJECTED'}`);line('small',view.ai);
 }};
}
