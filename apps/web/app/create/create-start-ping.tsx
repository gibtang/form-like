"use client";

import { useEffect } from "react";

/** Fires form_create_started once per page view of the guest builder. */
export function CreateStartPing() {
  useEffect(() => {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("event", "form_create_started");
  }, []);
  return null;
}
