export interface ForgeRespondBody {idea:string;repair?:{previous:string;errors:string[]}}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const bounded=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
export function validateModeration(value:unknown):{input:string[]}|null {
 if(!record(value)||Object.keys(value).some(key=>key!=='input')||!Array.isArray(value.input)||value.input.length<1||value.input.length>20||!value.input.every(item=>typeof item==='string'&&item.length<=8000)||value.input.reduce((sum,item)=>sum+item.length,0)>8000)return null;
 return {input:[...value.input]};
}
export function validateForgeRespond(value:unknown):ForgeRespondBody|null {
 if(!record(value)||Object.keys(value).some(key=>key!=='idea'&&key!=='repair')||!bounded(value.idea,300)||!value.idea.trim())return null;
 if(value.repair===undefined)return {idea:value.idea};
 const repair=value.repair;
 if(!record(repair)||Object.keys(repair).some(key=>key!=='previous'&&key!=='errors')||!bounded(repair.previous,32768)||!Array.isArray(repair.errors)||repair.errors.length<1||repair.errors.length>20||!repair.errors.every(item=>bounded(item,200)))return null;
 return {idea:value.idea,repair:{previous:repair.previous,errors:[...repair.errors]}};
}
