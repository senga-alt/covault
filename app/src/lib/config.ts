/**
 * Deployment-time constants with no heavy dependencies. Landing/brand code reads
 * these without importing lib/contract (which pulls @stacks/transactions), so the
 * SDK stays out of the initial bundle. contract.ts re-exports from here, so app
 * callers importing NETWORK from "../lib/contract" are unaffected.
 */
export const NETWORK = (import.meta.env.VITE_NETWORK ?? "testnet") as "testnet" | "mainnet";
