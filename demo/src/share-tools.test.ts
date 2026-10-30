import {JSDOM} from 'jsdom';
import {expect,it,vi} from 'vitest';
import {mountShareTools} from './share-tools';
it('copies only the demo link and shows confirmation',async()=>{
 const dom=new JSDOM('<input id="share-url" readonly value="https://streamervschat.kashifnazir.com/"><button id="copy-demo-link">Copy link</button>');
 try{const clipboard={writeText:vi.fn(async()=>{})};mountShareTools(dom.window.document,clipboard);dom.window.document.querySelector('button')!.click();await Promise.resolve();expect(clipboard.writeText).toHaveBeenCalledWith('https://streamervschat.kashifnazir.com/');expect(dom.window.document.querySelector('button')!.textContent).toBe('Copied ✓');}finally{dom.window.close();}
});
it('selects the read-only field when clipboard access fails',async()=>{
 const dom=new JSDOM('<input id="share-url" readonly value="https://streamervschat.kashifnazir.com/"><button id="copy-demo-link">Copy link</button>');
 try{mountShareTools(dom.window.document,{writeText:async()=>{throw new Error('denied');}});dom.window.document.querySelector('button')!.click();await Promise.resolve();const field=dom.window.document.querySelector('input')!;expect(field.selectionStart).toBe(0);expect(field.selectionEnd).toBe(field.value.length);expect(dom.window.document.activeElement).toBe(field);}finally{dom.window.close();}
});
