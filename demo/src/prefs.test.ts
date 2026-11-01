import {expect,it} from 'vitest';
import {createPrefs,defaultPrefs,PREFS_KEY,urlPrefs} from './prefs';
function memoryStorage(seed:Record<string,string>={}):Storage{
 const data=new Map(Object.entries(seed));
 return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,String(value));},removeItem:key=>{data.delete(key);},clear:()=>data.clear()};
}
it('starts on defaults, including the unused mode field, and saves a versioned key',()=>{
 const storage=memoryStorage(),prefs=createPrefs(()=>storage);
 expect(prefs.load()).toEqual({difficulty:null,input:'keyboard',posture:'standing',noPunch:false,sound:true,plain:false,crowd:50,mode:'boss'});
 prefs.save({difficulty:'hard',crowd:500,mode:'trainer'});expect(PREFS_KEY).toBe('svc.prefs.v1');
 expect(JSON.parse(storage.getItem(PREFS_KEY)!)).toEqual({difficulty:'hard',crowd:500,mode:'trainer'});
 expect(createPrefs(()=>storage).load()).toMatchObject({difficulty:'hard',crowd:500,mode:'trainer',input:'keyboard'});
});
it('ignores garbage: bad JSON, wrong types, unknown keys and out-of-range values',()=>{
 for(const text of ['{','null','[1,2]','"hard"','42',JSON.stringify({x:'a'.repeat(5000)})])expect(createPrefs(()=>memoryStorage({[PREFS_KEY]:text})).load()).toEqual(defaultPrefs());
 const prefs=createPrefs(()=>memoryStorage({[PREFS_KEY]:JSON.stringify({difficulty:'impossible',input:'pose',posture:7,noPunch:'yes',sound:false,crowd:51,mode:'boss',__proto__x:1,evil:'<b>'})}));
 expect(prefs.load()).toEqual({...defaultPrefs(),input:'pose',sound:false});
 const storage=memoryStorage();createPrefs(()=>storage).save({crowd:7 as never,difficulty:'easy',other:1} as never);expect(JSON.parse(storage.getItem(PREFS_KEY)!)).toEqual({difficulty:'easy'});
});
it('works with blocked or missing storage: reads give defaults, writes and reset never throw',()=>{
 const blocked=()=>{throw new DOMException('denied','SecurityError');};
 const throwing={getItem:blocked,setItem:blocked,removeItem:blocked,key:blocked,get length():number{return blocked();}} as unknown as Storage;
 for(const prefs of [createPrefs(blocked),createPrefs(()=>throwing),createPrefs(()=>null),createPrefs(()=>undefined)]){
  expect(prefs.load()).toEqual(defaultPrefs());expect(()=>prefs.save({difficulty:'hard'})).not.toThrow();expect(()=>prefs.reset()).not.toThrow();expect(prefs.load().difficulty).toBeNull();
 }
});
it('reads only its own version, and reset clears every svc.prefs.* version but nothing else',()=>{
 const storage=memoryStorage({'svc.prefs.v0':JSON.stringify({difficulty:'expert'}),'svc.prefs.v2':JSON.stringify({difficulty:'easy'}),'svc.calibration.standing':'keep','svc.twitch.fresh-login':'1'});
 const prefs=createPrefs(()=>storage);expect(prefs.load().difficulty).toBeNull();
 prefs.save({posture:'seated'});expect(prefs.stored()).toEqual({posture:'seated'});
 prefs.reset();expect(prefs.load()).toEqual(defaultPrefs());
 expect([...Array(storage.length)].map((_,i)=>storage.key(i)).sort()).toEqual(['svc.calibration.standing','svc.twitch.fresh-login']);
});
it('skips identical writes',()=>{
 const storage=memoryStorage();let writes=0;const counting={...storage,get length(){return storage.length;},setItem:(key:string,value:string)=>{writes++;storage.setItem(key,value);}} as Storage;
 const prefs=createPrefs(()=>counting);prefs.save({sound:false});prefs.save({sound:false});expect(writes).toBe(1);
});
it('parses URL values with the same validation; unrelated params are ignored',()=>{
 expect(urlPrefs('?difficulty=hard&crowd=0&noPunch=1&sound=off&scout=fast&fx=calm')).toEqual({difficulty:'hard',crowd:0,noPunch:true,sound:false});
 expect(urlPrefs('?difficulty=insane&crowd=-3&noPunch=maybe&input=gamepad&mode=boss')).toEqual({mode:'boss'});
 expect(urlPrefs('')).toEqual({});
});
