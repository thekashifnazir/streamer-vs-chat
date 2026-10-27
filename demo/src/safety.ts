/** This assertion is shared by the local launcher and the simulated source. */
export function assertSimulationAllowed(options: { liveTokenLoaded: boolean; mock?: boolean }): void {
  if (options.liveTokenLoaded && !options.mock) {
    throw new Error('Simulated chat refuses to start with a live Twitch token loaded. Use --mock explicitly for an isolated local simulation.');
  }
}
