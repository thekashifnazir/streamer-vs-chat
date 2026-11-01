import {DIFFICULTIES,type Difficulty} from '../../shared/src/tempo';
/** Setup choices that survive a reload. Never credentials, consent, the clear-space check or calibration (each has its own rules). */
export const PREFS_PREFIX='svc.prefs.',PREFS_VERSION=1,PREFS_KEY=`${PREFS_PREFIX}v${PREFS_VERSION}`;
type Field<T>={fallback:T;values?:readonly T[]};
const oneOf=<T extends string|number>(fallback:T,values:readonly T[]):Field<T>=>({fallback,values});
const flag=(fallback:boolean):Field<boolean>=>({fallback});
// One line per preference: a new field needs only its default and allowed values. difficulty null = never picked by hand.
export const PREF_FIELDS={
 difficulty:{fallback:null,values:DIFFICULTIES} as Field<Difficulty|null>,
 input:oneOf<'keyboard'|'pose'>('keyboard',['keyboard','pose']),
 posture:oneOf<'standing'|'seated'>('standing',['standing','seated']),
 noPunch:flag(false),sound:flag(true),plain:flag(false),
 // 5 by default (Kash, 1 Nov): a calmer crowd, so SUPERs are rare and attack, defend, counter is easy to see.
 crowd:oneOf<0|3|5|50|500>(5,[0,3,5,50,500]),
 mode:oneOf<'boss'|'trainer'>('boss',['boss','trainer']),
 // Crowd Trainer options; Boss Fight ignores them.
 southpaw:flag(false),anyHand:flag(false),
 // Webcam: draw the tracked skeleton on the camera circle (off by default; setup's calibration preview always shows it).
 skeleton:flag(false),
};
export type Prefs={-readonly [K in keyof typeof PREF_FIELDS]:(typeof PREF_FIELDS)[K]['fallback']};
export type PrefKey=keyof Prefs;
export const PREF_KEYS=Object.keys(PREF_FIELDS) as PrefKey[];
export function defaultPrefs():Prefs{return Object.fromEntries(PREF_KEYS.map(key=>[key,PREF_FIELDS[key].fallback])) as Prefs;}
function valid(key:PrefKey,value:unknown):boolean{const field=PREF_FIELDS[key] as Field<unknown>;return field.values?(field.values as readonly unknown[]).includes(value):typeof value===typeof field.fallback;}
/** Keeps only known keys with allowed values; anything else is dropped, never coerced. */
export function cleanPrefs(value:unknown):Partial<Prefs>{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const out:Record<string,unknown>={};for(const key of PREF_KEYS)if(Object.hasOwn(value,key)&&valid(key,(value as Record<string,unknown>)[key]))out[key]=(value as Record<string,unknown>)[key];
 return out as Partial<Prefs>;
}
/** Query values named like a field (?difficulty=hard, ?crowd=0, ?noPunch=1) win for that visit only. */
export function urlPrefs(search:string):Partial<Prefs>{
 const params=new URLSearchParams(search),raw:Record<string,unknown>={};
 for(const key of PREF_KEYS){const text=params.get(key);if(text===null)continue;const fallback=PREF_FIELDS[key].fallback;
  raw[key]=typeof fallback==='boolean'?({'1':true,true:true,on:true,'0':false,false:false,off:false} as Record<string,boolean>)[text.toLowerCase()]:typeof fallback==='number'&&/^\d+$/.test(text)?Number(text):text;}
 return cleanPrefs(raw);
}
export type PrefsStore={load():Prefs;stored():Partial<Prefs>;save(patch:Partial<Prefs>):void;reset():void};
/** Every storage call is guarded: private windows, blocked storage and thumbnails fall back to defaults. */
export function createPrefs(storage:()=>Storage|null|undefined=()=>globalThis.localStorage):PrefsStore{
 const read=():Partial<Prefs>=>{try{const text=storage()?.getItem(PREFS_KEY);return text&&text.length<=4096?cleanPrefs(JSON.parse(text)):{};}catch{return {};}};
 return {
  load:()=>({...defaultPrefs(),...read()}),stored:read,
  save(patch){const before=read(),next={...before,...cleanPrefs(patch)};if(JSON.stringify(next)===JSON.stringify(before))return;try{storage()?.setItem(PREFS_KEY,JSON.stringify(next));}catch{/* Unsaved preferences only cost a reload. */}},
  // Clears this and older/newer versions of the key; other svc.* data (calibration, Twitch tab login) is untouched.
  reset(){try{const store=storage();if(!store)return;const keys:string[]=[];for(let i=0;i<store.length;i++){const key=store.key(i);if(key?.startsWith(PREFS_PREFIX))keys.push(key);}for(const key of keys)store.removeItem(key);}catch{/* Nothing stored to clear. */}},
 };
}
