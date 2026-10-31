/** Keep browser/driver error messages out of user-facing camera copy. */
export function cameraErrorMessage(error:unknown):string {
 const name=typeof error==='object'&&error!==null&&'name' in error?error.name:null;
 if(name==='NotAllowedError')return "Camera blocked. Allow it in your browser's site settings, or use the keyboard.";
 if(name==='NotFoundError'||name==='NotSupportedError'||name==='OverconstrainedError')return 'No camera found. Use the keyboard instead.';
 return 'Camera unavailable. Use the keyboard instead.';
}
export function showCameraError(root:Document,error:unknown):void {
 const message=cameraErrorMessage(error);
 const feedback=root.getElementById('camera-feedback')!;
 feedback.textContent=message;feedback.hidden=false;
 root.getElementById('camera-status')!.textContent=message;
 feedback.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
