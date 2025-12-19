/**
 * Haptic feedback utility with graceful degradation
 * Uses Navigator Vibration API (94% mobile browser support)
 */

type HapticPattern = 'success' | 'error' | 'light' | 'medium';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 30,      // Subtle tap (submit, navigation)
  medium: 50,     // Clear feedback (copy success)
  success: [50, 100, 50], // Double pulse (operation complete)
  error: [100, 100, 100, 100, 100], // Triple pulse (error state)
};

/**
 * Trigger haptic feedback if supported
 * Fails silently on unsupported browsers/devices
 */
export function triggerHaptic(pattern: HapticPattern = 'medium'): void {
  if (!('vibrate' in navigator)) {
    return; // Silent fail - no console spam
  }

  try {
    const vibrationPattern = PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
  } catch {
    // Silent fail - some browsers throw on permission issues
  }
}

/**
 * Check if haptics are supported
 * Useful for conditional UI feedback
 */
export function supportsHaptics(): boolean {
  return 'vibrate' in navigator;
}
