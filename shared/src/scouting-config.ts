/** Evidence thresholds only. Combat arithmetic and timing never depend on this config. */
export type ScoutingConfig=Readonly<{minRound:number;minSamples:number;minShare:number;minWilsonLower:number}>;
/** SPEC §4 defaults. The no-login demo may explicitly opt into a labelled preview. */
export const DEFAULT_SCOUTING_CONFIG:ScoutingConfig=Object.freeze({minRound:2,minSamples:12,minShare:.65,minWilsonLower:.60});
