import {expect,it,vi} from 'vitest';
import {createGuardResume} from './hosted-pause';
it('requires a continuous fresh framed guard for one second and resets on any blocker',()=>{
 const resume=vi.fn(),hold=createGuardResume(resume);hold.sample(true,true,0);hold.sample(true,true,999);expect(resume).not.toHaveBeenCalled();hold.sample(false,true,1000);hold.sample(true,true,1100);hold.sample(true,false,2000);hold.sample(true,true,2100);hold.sample(true,true,3100);expect(resume).toHaveBeenCalledOnce();hold.reset();hold.sample(true,true,4000);expect(resume).toHaveBeenCalledOnce();
});
