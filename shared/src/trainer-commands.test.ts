import {expect,it} from 'vitest';
import {isTrainerStop,parseTrainerCommand,trainerCommandLegend} from './trainer-commands';
import {parseChatVote} from './index';
it('parses every combo command on the first word, case-insensitive, with ! required',()=>{
 for(const id of ['12','112','121','1212','12s','s12','12g','2s2'])expect(parseTrainerCommand(`!${id}`)).toEqual({kind:'combo',combo:id});
 expect(parseTrainerCommand('  !12S  let’s go')).toEqual({kind:'combo',combo:'12s'});expect(parseTrainerCommand('!S12')).toEqual({kind:'combo',combo:'s12'});
 expect(parseTrainerCommand('12')).toBeNull();expect(parseTrainerCommand('go !12')).toBeNull();expect(parseTrainerCommand('!123')).toBeNull();expect(parseTrainerCommand('')).toBeNull();
});
it('parses pace votes',()=>{expect(parseTrainerCommand('!FASTER')).toEqual({kind:'pace',pace:'faster'});expect(parseTrainerCommand('!slower pls')).toEqual({kind:'pace',pace:'slower'});});
it('keeps Boss Fight commands separate',()=>{expect(parseTrainerCommand('!jab')).toBeNull();expect(parseChatVote('!12','u',0,false)).toBeNull();});
it('lets only mods and the broadcaster stop the workout',()=>{expect(isTrainerStop('!stop',true)).toBe(true);expect(isTrainerStop('!STOP now',true)).toBe(true);expect(isTrainerStop('!stop',false)).toBe(false);});
it('lists the menu',()=>{expect(trainerCommandLegend()).toContain('!12 One-two');expect(trainerCommandLegend()).toContain('!faster');});
