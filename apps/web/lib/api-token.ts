import "server-only";
import { ApiToken } from "./models";
import { sha256Hex } from "./crypto";
import { randomBytes } from "node:crypto";

const TOKEN_PATTERN = /^Bearer (fl_live_[0-9a-f]{64})$/;

export interface NewApiToken {
  tokenId: string;
  token: string;
  keyPrefix: string;
}

/** Mints a bearer token for the user; the raw value is shown exactly once. */
export async function createApiToken(userId: string, name: string): Promise<NewApiToken> {
  const secret = randomHex(32);
  const token = `fl_live_${secret}`;
  const keyPrefix = `fl_live_${secret.slice(0, 6)}`;
  const tokenId = `tok_${randomHex(16)}`;
  await ApiToken.create({
    tokenId,
    userId,
    name: name.trim(),
    keyHash: sha256Hex(token),
    keyPrefix,
  });
  return { tokenId, token, keyPrefix };
}

export async function listApiTokens(userId: string) {
  return ApiToken.find({ userId, revokedAt: null }).sort({ createdAt: -1 }).lean();
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const result = await ApiToken.updateOne({ tokenId, userId, revokedAt: null }, { revokedAt: new Date() });
  return result.matchedCount > 0;
}

/** Resolves a bearer key to a live token row, or null. Touches lastUsedAt. */
export async function requireApiToken(req: Request): Promise<{ userId: string } | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = TOKEN_PATTERN.exec(header);
  if (!match || !match[1]) return null;
  const tokenRow = await ApiToken.findOne({ keyHash: sha256Hex(match[1]), revokedAt: null });
  if (!tokenRow) return null;
  void ApiToken.updateOne({ _id: tokenRow._id }, { $set: { lastUsedAt: new Date() } }).catch((err: unknown) => {
    console.error("api-token: failed to touch lastUsedAt:", err instanceof Error ? err.message : err);
  });
  return { userId: tokenRow.userId };
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}
