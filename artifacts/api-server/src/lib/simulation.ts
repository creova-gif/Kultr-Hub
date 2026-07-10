/**
 * Server-side authority on whether a payment provider may run in "simulated"
 * (skip-the-gateway) mode. This must NEVER be derived from client input — a
 * request body flag would let any caller mint free tickets.
 *
 * Simulation is permitted only when BOTH hold:
 *   1. We are not in production (NODE_ENV !== "production"), and
 *   2. The provider has no live credentials configured.
 *
 * In production, providers are always required to confirm the payment for real.
 */
export function simulationAllowed(providerConfigured: boolean): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  return !isProduction && !providerConfigured;
}
