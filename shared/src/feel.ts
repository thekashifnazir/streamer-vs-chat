/** Presentation only. These values never enter the combat reducer or its clock. */
export const FEEL={
 hitstop:{BLOCK:80,PERFECT:160,DODGE:60,counter:120,JAB:120,HOOK_L:150,HOOK_R:150,COMBO:90,SUPER:220,KO:400},
 trauma:{JAB:.4,HOOK_L:.5,HOOK_R:.5,COMBO:.35,SUPER:.8,KO:1,counter:.3,BLOCK:0,PERFECT:0,DODGE:0},
 shake:{offsetPx:24,rotationDeg:1.5,decayPerSecond:1.5,frequencyHz:20},
 ko:{slowSpeed:.5,slowDurationMs:600},
 trail:{delayMs:500},
 superNotice:{readyMs:3000,deniedMs:1000},
 bossHit:{floatMs:600,floatRisePx:72,knockbackPx:12,knockbackMs:180,trailMs:400,trailDelayMs:400,numberLanes:3,numberLanePx:150,flashBottomPx:100,flashMs:80,flashWidth:150,flashHeight:200,flashColor:'#ffffff',maxNumbers:12},
 slam:{durationMs:120,fromScale:1.25,calmFadeMs:150},
 flash:{areaPx:390*44,largeAreaPx:57500,maxLargePerSecond:3,color:'#ff3b30',durationMs:80},
} as const;
