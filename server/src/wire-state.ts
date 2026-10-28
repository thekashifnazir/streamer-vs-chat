import type {Attack,GameState,Resolution} from '../../shared/src/engine';
/** HUD-compatible view. Attribution stays exclusively in authoritative server memory.
 * Current vote identities remain because raid influence is derived by the HUD.
 */
export function createWireProjection(){
 let attacks:Attack[]|undefined,resolved:Resolution[]|undefined;
 let attackView:Attack[]=[],resolutionView:Resolution[]=[];
 const noDamage:GameState['log']['damage']=[];
 const attack=({supporters,actual_damage,...view}:Attack):Attack=>view;
 const resolution=({supporters,actual_dmg,actual_counter_dmg,...view}:Resolution):Resolution=>view;
 return (state:GameState):GameState=>{
  if(attacks!==state.log.telegraphs){attacks=state.log.telegraphs;attackView=attacks.map(attack);}
  if(resolved!==state.log.resolved){resolved=state.log.resolved;resolutionView=resolved.map(resolution);}
  return {...state,activeAttack:state.activeAttack?attack(state.activeAttack):null,
   log:{...state.log,telegraphs:attackView,resolved:resolutionView,damage:noDamage}};
 };
}
