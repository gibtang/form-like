import { randomBytes } from "node:crypto";

/** 32 lowercase hex chars (128 bits of entropy). */
export function c32hex(): string {
  return randomBytes(16).toString("hex");
}

export type IdPrefix = "fld_" | "opt_" | "frm_" | "ver_" | "sub_";

export function newId(prefix: IdPrefix): string {
  return prefix + c32hex();
}

/** True when `id` carries the given prefix and the expected hex body shape. */
export function isId(prefix: IdPrefix, id: unknown): id is string {
  return typeof id === "string" && new RegExp(`^${prefix}[0-9a-f]{32}$`).test(id);
}
