import type {ForgeSnapshot} from '../../shared/src/forge-view';
import type {BossDef} from '../../shared/src/boss-def';
/** One plain line on the round results card so viewers see Boss Forge working between rounds (Kash, 2 Nov: it worked, but nothing on screen said so). */
export function forgeResultsLine(snapshot:ForgeSnapshot|null,pending:BossDef|null,currentBoss:string|null):string|null{
 if(pending&&pending.name!==currentBoss)return `NEW BOSS READY · ${pending.name} · fights next round`;
 if(!snapshot)return null;
 if(['generating','validating','tuning'].includes(snapshot.status))return 'BOSS FORGE · building chat’s boss…';
 if(snapshot.status==='rejected')return 'BOSS FORGE · that boss failed the balance test';
 if(snapshot.status==='collecting'&&snapshot.ideas.length)return `BOSS FORGE · ${snapshot.ideas.length} idea${snapshot.ideas.length===1?'':'s'} in · streamer types !forge to build`;
 return null;
}
