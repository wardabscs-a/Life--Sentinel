import { useState, useCallback, useRef } from 'react';

/**
 * Hook for hold-to-activate SOS button
 * @param {number} holdDuration - Duration in ms (default: 2000)
 * @returns {Object} { isHolding, progress, handlers }
 */
export function useHoldToActivate(holdDuration = 2000) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activated, setActivated] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const startHold = useCallback(() => {
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const prog = Math.min(elapsed / holdDuration, 1);
      setProgress(prog);

      if (prog >= 1) {
        clearInterval(intervalRef.current);
        setActivated(true);
        setIsHolding(false);
      }
    }, 50);
  }, [holdDuration]);

  const endHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsHolding(false);
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    setActivated(false);
    setProgress(0);
    setIsHolding(false);
  }, []);

  return {
    isHolding,
    progress,
    activated,
    startHold,
    endHold,
    reset,
  };
}
