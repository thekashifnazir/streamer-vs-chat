export const NO_POSE_MESSAGE = 'NO POSE: step back into frame';
export function trackingMessage(hasPose:boolean, framed:boolean, seatedTooClose:boolean):string {
  if(!hasPose)return NO_POSE_MESSAGE;
  if(!framed)return 'Keep head, shoulders and both wrists in frame.';
  if(seatedTooClose)return 'Sit about 1 m further back: shoulders should span at most 20% of the frame.';
  return 'Head, shoulders and wrists in frame.';
}
