import { useEffect, useState } from "react";

export const useClock = (running: boolean, startedAt: number | null) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [running]);

  return startedAt ? now - startedAt : 0;
};
