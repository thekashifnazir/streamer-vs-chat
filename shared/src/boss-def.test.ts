import{readFileSync,readdirSync}from'node:fs';
import{expect,it}from'vitest';
import{BOSS_DEF_SCHEMA,DEFAULT_BOSS,isDefaultBoss,validateBoss,type BossDef}from'./boss-def';
const fixture=(name='tin-tactician')=>JSON.parse(readFileSync(new URL(`../../fixtures/bosses/${name}.json`,import.meta.url),'utf8')) as BossDef;
it('accepts all three deterministic prebaked bosses without privileged commands',()=>{
 for(const file of readdirSync(new URL('../../fixtures/bosses/',import.meta.url)).filter(name=>name!=='default.json'))expect(validateBoss(fixture(file.slice(0,-5)),['kashruns'])).toEqual([]);
});
it('grandfathers only the exact canonical default when explicitly enabled',()=>{
 expect(fixture('default')).toEqual(DEFAULT_BOSS);expect(isDefaultBoss(fixture('default'))).toBe(true);expect(validateBoss(DEFAULT_BOSS)).toContain('Move 5.command is reserved.');expect(validateBoss(DEFAULT_BOSS,[],{allowDefault:true})).toEqual([]);
 const forged=fixture('default');forged.hp=136;expect(validateBoss(forged,[],{allowDefault:true})).toContain('Move 5.command is reserved.');expect(isDefaultBoss({...DEFAULT_BOSS,extra:true})).toBe(false);expect(Object.isFrozen(DEFAULT_BOSS)).toBe(true);expect(Object.isFrozen(DEFAULT_BOSS.moves[0])).toBe(true);
});
it.each(['!under_score','!éclair','!🔥','!UPPER','!x','!toolongletters','jab','!a1','!tap-now'])('rejects invalid command %s',command=>{
 const def=fixture();def.moves[0]!.command=command;expect(validateBoss(def).some(error=>error.includes('.command'))).toBe(true);
});
it.each(['!pause','!stop','!super','!vote','!forge'])('reserves %s even when allowDefault is supplied',command=>{
 const def=fixture();def.moves[0]!.command=command;expect(validateBoss(def,[],{allowDefault:true})).toContain('Move 1.command is reserved.');
});
it('rejects duplicate commands, missing guard or lean, invalid defences and extra fields',()=>{
 const duplicate=fixture();duplicate.moves[1]!.command=duplicate.moves[0]!.command;expect(validateBoss(duplicate)).toContain('Move 2.command must be unique.');
 const lean=fixture();lean.moves.forEach(move=>move.defence='guard');expect(validateBoss(lean)).toContain('Boss needs at least one lean move.');
 const guard=fixture();guard.moves.forEach(move=>move.defence='lean_any');expect(validateBoss(guard)).toContain('Boss needs at least one guard move.');
 const def=fixture();(def.moves[0] as any).defence='duck';(def.moves[0] as any).url='external';(def as any).secret='extra';expect(validateBoss(def).filter(error=>error.includes('unknown field'))).toHaveLength(2);expect(validateBoss(def)).toContain('Move 1.defence is invalid.');
});
it('enforces all numeric bounds, finite numbers, integral hits and total per-attack damage',()=>{
 for(const hp of [89,201,999,NaN,Infinity,'135'])expect(validateBoss({...fixture(),hp}).some(error=>error.includes('Boss.hp'))).toBe(true);
 for(const[field,values]of Object.entries({damage:[3.9,30.1,NaN,Infinity],chip:[-1,5,NaN],telegraph_ms:[599,1201,Infinity],hits:[0,4,1.5,NaN]}))for(const value of values){const def=fixture();(def.moves[0] as any)[field]=value;expect(validateBoss(def).length).toBeGreaterThan(0);}
 const total=fixture();total.moves[0]!.hits=3;total.moves[0]!.damage=12.1;expect(validateBoss(total)).toContain('Move 1 total hit damage must not exceed 36.');
 const edge=fixture();edge.hp=90;Object.assign(edge.moves[0]!,{damage:12,chip:6,telegraph_ms:600,hits:3});Object.assign(edge.moves[1]!,{damage:30,chip:15,telegraph_ms:1200,hits:1});expect(validateBoss(edge)).toEqual([]);
});
it('validates trimmed nonempty bounded printable strings and 3–5 moves',()=>{
 for(const[name,tagline]of [['','ok'],[' '.repeat(24),'ok'],['x'.repeat(25),'ok'],['ok','x'.repeat(81)],['ok','bad\ntext']])expect(validateBoss({...fixture(),name,tagline}).length).toBeGreaterThan(0);
 for(const length of [0,2,6]){const def=fixture();def.moves=Array.from({length},()=>({...def.moves[0]!}));expect(validateBoss(def)).toContain('Boss.moves must contain 3–5 moves.');}
 const def=fixture();def.moves[0]!.label='x'.repeat(33);expect(validateBoss(def).some(error=>error.includes('.label'))).toBe(true);
 for(const malformed of [null,[],true,'boss',{}, {...fixture(),moves:null}])expect(validateBoss(malformed).length).toBeGreaterThan(0);
});
it.each(['kashrunz','K.A.S.H.R.U.N.S','KáshRuns','kаshruns','kashrunzfan','xxkashrunsxx','K.A.S.H.R.U.N.Z'])('rejects protected-name impersonation %s',name=>{
 expect(validateBoss({...fixture(),name},['kashruns']).some(error=>error.includes('protected name'))).toBe(true);
});
it('checks every output string and distinguishes short protected names from ordinary word fragments',()=>{
 const def=fixture();def.moves[0]!.label='Kashrunz attack';expect(validateBoss(def,['kashruns']).some(error=>error.includes('protected name'))).toBe(true);
 expect(validateBoss(fixture(),['A','I'])).toEqual([]);expect(validateBoss({...fixture(),name:'龍・騎・士'},['龍騎士']).some(error=>error.includes('protected name'))).toBe(true);expect(validateBoss({...fixture(),tagline:'A'},['a']).some(error=>error.includes('protected name'))).toBe(true);
 for(const word of ['FuCk','f.u.c.k','sh1t'])expect(validateBoss({...fixture(),tagline:word}).some(error=>error.includes('blocked word'))).toBe(true);
 expect(validateBoss({...fixture(),name:'Classic Sentinel'})).toEqual([]);
});
it('keeps the structured-output schema strict, complete and browser-safe',()=>{
 expect(BOSS_DEF_SCHEMA.additionalProperties).toBe(false);expect(BOSS_DEF_SCHEMA.required).toEqual(Object.keys(BOSS_DEF_SCHEMA.properties));const move=BOSS_DEF_SCHEMA.properties.moves.items;expect(move.additionalProperties).toBe(false);expect(move.required).toEqual(Object.keys(move.properties));expect(move.properties.defence.enum).toEqual(['guard','lean_left','lean_right','lean_any']);expect(JSON.stringify(BOSS_DEF_SCHEMA)).not.toContain('http');
 const def=fixture(),before=JSON.stringify(def);validateBoss(def,['kashruns']);expect(JSON.stringify(def)).toBe(before);
});
