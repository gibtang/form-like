"use client";

import { useState } from "react";

export function CopyTokenButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  return (
    <button
      type="button"
      data-testid="copy-token"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(token);
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
      className="mt-2 rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
    >
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : "Copy token"}
    </button>
  );
}
