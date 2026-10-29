import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect,it} from 'vitest';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const documents=['README.md','JUDGES.md','docs/DEVELOPMENT.md'];
function withoutFences(markdown:string):string {
 let fence:{character:string;length:number}|undefined;
 return markdown.split('\n').map(line=>{
  const marker=line.match(/^ {0,3}(`{3,}|~{3,})/);
  if(marker){const character=marker[1]![0]!,length=marker[1]!.length;if(!fence)fence={character,length};else if(character===fence.character&&length>=fence.length)fence=undefined;return '';}
  return fence?'':line;
 }).join('\n');
}
function entities(value:string):string {
 return value.replace(/&#(x[\da-f]+|\d+);/gi,(_,number:string)=>String.fromCodePoint(number[0]!.toLowerCase()==='x'?parseInt(number.slice(1),16):Number(number)))
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function anchors(markdown:string):Set<string> {
 const text=withoutFences(markdown),result=new Set<string>(),used=new Set<string>();
 const add=(heading:string)=>{
  const plain=entities(heading.replace(/<[^>]*>/g,'').replace(/!?(?:\[([^\]]*)\])\([^)]*\)/g,'$1').replace(/[`*~]/g,''));
  const base=plain.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu,'').replace(/\s/g,'-');
  let slug=base,index=0;while(used.has(slug))slug=`${base}-${++index}`;used.add(slug);result.add(slug);
 };
 const lines=text.split('\n');
 for(let index=0;index<lines.length;index++){
  const line=lines[index]!,heading=line.match(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+\s*)?$/);
  if(heading)add(heading[1]!);
  else if(index>0&&/^ {0,3}(?:=+|-+)\s*$/.test(line)&&lines[index-1]!.trim())add(lines[index-1]!.trim());
 }
 for(const match of text.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi))result.add(entities(match[1]!));
 return result;
}
function links(markdown:string):string[] {
 const text=withoutFences(markdown).replace(/(`+)[\s\S]*?\1/g,''),result:string[]=[];
 // Balanced parentheses preserve paths such as assets/example_(final).png.
 for(const match of text.matchAll(/\]\(\s*/g)){
  let cursor=match.index!+match[0].length,destination='',depth=0;
  if(text[cursor]==='<'){const end=text.indexOf('>',cursor+1);if(end>=0)result.push(text.slice(cursor+1,end));continue;}
  for(;cursor<text.length;cursor++){
   const character=text[cursor]!;
   if(character==='\\'&&cursor+1<text.length){destination+=text[++cursor];continue;}
   if(character==='(')depth++;
   if(character===')'){if(depth===0)break;depth--;}
   if(/\s/.test(character)&&depth===0)break;
   destination+=character;
  }
  if(destination)result.push(destination);
 }
 for(const match of text.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))result.push(match[1]??match[2]??match[3]!);
 // Include reference-style destinations, rather than silently missing image refs.
 for(const match of text.matchAll(/^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm))result.push(match[1]??match[2]!);
 return result.map(entities);
}
it('resolves judge and development documentation links to tracked files and anchors',()=>{
 const tracked=new Set(execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean));
 const failures:string[]=[];
 for(const document of documents){
  const content=readFileSync(resolve(root,document),'utf8');
  for(const raw of links(content)){
   if(!raw||/^(?:[a-z][\w+.-]*:|\/\/)/i.test(raw)||/^\[(?:VIDEO_URL|DEVPOST_URL)\]$/.test(raw))continue;
   const hash=raw.indexOf('#'),fragment=hash<0?'':decodeURIComponent(raw.slice(hash+1));
   const beforeHash=hash<0?raw:raw.slice(0,hash),path=decodeURIComponent(beforeHash.split('?')[0]!);
   const target=path?relative(root,resolve(path.startsWith('/')?root:dirname(resolve(root,document)),path.replace(/^\//,''))):document;
   if(!tracked.has(target)){failures.push(`${document}: ${raw} → untracked or missing ${target}`);continue;}
   if(fragment&&!anchors(readFileSync(resolve(root,target),'utf8')).has(fragment))failures.push(`${document}: ${raw} → missing #${fragment} in ${target}`);
  }
 }
 expect(failures,'Broken relative documentation links').toEqual([]);
});
it('understands duplicate GitHub headings, literal code, HTML and reference links',()=>{
 expect([...anchors('# A *heading*!\n# A heading!\n# A heading-1\n# A heading!\n\n```md\n# Hidden\n```')]).toEqual(['a-heading','a-heading-1','a-heading-1-1','a-heading-2']);
 expect(links('`[ignored](missing)`\n```html\n<a href="missing">\n```\n[local](docs/file_(final).md#name "title") <img src="https://example.com/image.png">\n[ref]: <README.md#streamer-vs-chat>')).toEqual(['docs/file_(final).md#name','https://example.com/image.png','README.md#streamer-vs-chat']);
});
