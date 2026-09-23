import { useEffect, useState } from "react";
import { fmt } from "../api";

// Ticks on its own so the rest of the page (e.g. the puzzle board) never re-renders.
export default function Clock({ state, getElapsed, className = "" }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);
  if (!state) return null;
  const left = Math.max(0, state.durationSec * 1000 - getElapsed());
  return (
    <span
      className={`clock ${left < 60000 && state.status === "running" ? "warn" : ""} ${className}`}
    >
      {fmt(left)}
    </span>
  );
}
