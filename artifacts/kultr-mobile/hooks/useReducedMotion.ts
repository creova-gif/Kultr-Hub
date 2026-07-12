import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Tracks the OS-level "Reduce Motion" accessibility setting (WCAG 2.2 SC
 * 2.3.3 Animation from Interactions) so non-essential animations can be
 * skipped or shortened for users who have it enabled.
 *
 * Reads the current value once on mount via
 * `AccessibilityInfo.isReduceMotionEnabled()`, then stays live-updated by
 * subscribing to the `reduceMotionChanged` event — the user can flip the
 * setting while the app is running (e.g. mid-session from Control Center),
 * so a one-time read on mount isn't enough.
 */
export function useReducedMotion(): boolean {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotionEnabled(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduceMotionEnabled(enabled)
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotionEnabled;
}
