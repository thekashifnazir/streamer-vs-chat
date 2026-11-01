import {JSDOM} from 'jsdom';
import {expect,it} from 'vitest';
import {createGame} from '../../shared/src/engine';
import {DEFAULT_BOSS} from '../../shared/src/boss-def';
import {formatRoundResult,roundResultBody} from '../../shared/src/result-text';
import {createSimChatFeed,mountSimChat,simHandle,simVoteText,SIM_BOT} from './sim-chat';
it('uses plainly fake handles and the real command for each vote',()=>{
 expect(simHandle('sim-17')).toBe('sim_viewer_17');expect(simHandle('kash')).toBe('sim_viewer');expect(simHandle('sim-1<b>')).toBe('sim_viewer');
 expect(simVoteText('HOOK_L',null,.1)).toBe('!l');expect(simVoteText('HOOK_L',null,.9)).toBe('!left');expect(simVoteText('JAB',DEFAULT_BOSS,.9)).toBe('!jab');
});
it('samples a 500-viewer beat and releases at most one line per 400 ms (2.5 a second)',()=>{
 const feed=createSimChatFeed();feed.offer(Array.from({length:500},(_,i)=>({user:`sim-${i+1}`,text:'!j'})));
 for(let at=0;at<=1000;at+=100)feed.tick(at);
 expect(feed.lines).toHaveLength(3);expect(feed.lines.every(line=>/^sim_viewer_\d+$/.test(line.user)&&line.kind==='viewer')).toBe(true);
 for(let at=1100;at<=10000;at+=100)feed.tick(at);expect(feed.lines.length).toBeLessThanOrEqual(6);
});
it('bot lines post at once under the bot name and drop queued votes from the ended round',()=>{
 const feed=createSimChatFeed(),state=createGame();state.log.rounds.push({number:1,winner:'streamer',streamer_hp:80,boss_hp:0} as never);state.match.round_wins.streamer=1;
 feed.offer([{user:'sim-1',text:'!j'},{user:'sim-2',text:'!c'}]);feed.drop();feed.bot(formatRoundResult(roundResultBody(state,state.log.rounds[0]!)));for(let at=0;at<2000;at+=100)feed.tick(at);
 expect(feed.lines).toHaveLength(1);expect(feed.lines[0]).toMatchObject({kind:'bot',user:SIM_BOT,note:'BOT · what your bot would post'});expect(feed.lines[0]!.text).toMatch(/^Streamer vs Chat · Round 1: STREAMER wins \(80\/100 vs 0\/\d+ HP\) · 1–0/);
});
it('renders a SIMULATED panel and a two-line phone strip, hidden when there is no fight',()=>{
 const dom=new JSDOM('<main><div id="stage"></div><section class="demo-controls"><button>Esc Pause</button></section></main>');const doc=dom.window.document;
 const view=mountSimChat(doc,doc.getElementById('stage')!),feed=createSimChatFeed();
 feed.offer([{user:'sim-3',text:'!left'}]);feed.tick(0);feed.bot('Streamer vs Chat · Round 1');feed.you('Workout done.','YOUR LINE');feed.offer([{user:'sim-4',text:'<img src=x>'}]);feed.tick(1000);
 view.render(feed,'boss');
 const layer=doc.querySelector<HTMLElement>('.sim-chat-layer')!,strip=doc.querySelector<HTMLElement>('.demo-controls>.sim-chat-strip')!;
 expect(layer.hidden).toBe(false);expect(layer.dataset.mode).toBe('boss');expect(layer.querySelector('h3')!.textContent).toContain('SIMULATED CHAT');
 expect([...layer.querySelectorAll('li')].map(li=>li.textContent)).toEqual(['sim_viewer_3 !left',`${SIM_BOT} BOT · what your bot would post Streamer vs Chat · Round 1`,'you YOUR LINE Workout done.','sim_viewer_4 <img src=x>']);
 expect(layer.querySelector('img')).toBeNull();expect(strip.querySelectorAll('li')).toHaveLength(2);
 view.render(feed,null);expect(layer.hidden).toBe(true);expect(strip.hidden).toBe(true);dom.window.close();
});
