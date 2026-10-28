import type {ViewerMemoryView} from '../../shared/src/viewer-memory';
import type {Move} from '@svc/shared';
export function memoryPresentation(view:ViewerMemoryView|null,move?:Move){
 if(!view)return null;
 return {simulated:view.simulated,record:{...view.record},hall:view.hallOfFame.slice(0,4).map(entry=>({name:entry.name,koVotes:entry.koVotes})),
  nemesis:view.nemesis?.active?{name:view.nemesis.name,koVotes:view.nemesis.koVotes}:null,
  koMove:move&&view.nemesis?.favMove===move?`${view.nemesis.name}’s KO MOVE`:'',mvpStreak:view.mvpStreak};
}
