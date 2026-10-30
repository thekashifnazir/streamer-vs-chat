/** Local clipboard action only; no metrics, identities, credentials or network. */
export function mountShareTools(doc:Document=document,clipboard:Pick<Clipboard,'writeText'>|undefined=globalThis.navigator?.clipboard){
 const field=doc.getElementById('share-url') as HTMLInputElement|null,button=doc.getElementById('copy-demo-link') as HTMLButtonElement|null;
 if(!field||!button)return;
 button.addEventListener('click',async()=>{try{if(!clipboard)throw new Error('clipboard unavailable');await clipboard.writeText(field.value);button.textContent='Copied ✓';}catch{field.focus();field.select();button.textContent='Select and copy link';}});
}
