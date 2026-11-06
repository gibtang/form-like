"use client";

/**
 * Browser-safe id generation matching lib/ids.ts format (prefix + 32 hex).
 * Client editor code cannot import node:crypto, so new fields/options mint
 * ids here and the same isId() validation applies after the server action.
 */
export function newIdClient(prefix: "fld_" | "opt_"): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
