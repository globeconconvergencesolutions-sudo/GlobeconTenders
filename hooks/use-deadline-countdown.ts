"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatCountdownLabel,
  msUntilDeadline,
} from "@/lib/tenders/lifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Live countdown for hard deadlines within 24h.
 * When msLeft hits 0, calls onExpired once (used to hide Live cards).
 */
export function useDeadlineCountdown(
  deadline: Date | string,
  options: {
    enabled: boolean;
    onExpired?: () => void;
  },
) {
  const { enabled } = options;
  const onExpiredRef = useRef(options.onExpired);
  onExpiredRef.current = options.onExpired;
  const firedRef = useRef(false);

  const [msLeft, setMsLeft] = useState(() =>
    enabled ? msUntilDeadline(deadline) : Number.POSITIVE_INFINITY,
  );

  useEffect(() => {
    firedRef.current = false;
    if (!enabled) {
      setMsLeft(Number.POSITIVE_INFINITY);
      return;
    }

    const tick = () => {
      const next = msUntilDeadline(deadline);
      setMsLeft(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpiredRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline, enabled]);

  const showCountdown = enabled && msLeft > 0 && msLeft <= DAY_MS;

  return {
    msLeft,
    showCountdown,
    label: showCountdown ? formatCountdownLabel(msLeft) : null,
    expired: enabled && msLeft <= 0,
  };
}
