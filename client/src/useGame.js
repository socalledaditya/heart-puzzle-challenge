import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { getSocket } from './socket';

// Live game state from the server. The clock is derived from the server's elapsed value
// plus local time since receipt, so it never depends on the device's wall clock.
export function useGame() {
  const [state, setState] = useState(null);
  const rx = useRef(performance.now());

  useEffect(() => {
    const s = getSocket();
    const on = (st) => { rx.current = performance.now(); setState(st); };
    s.on('game:state', on);
    api.get('/game/state').then((r) => on(r.data)).catch(() => {});
    return () => s.off('game:state', on);
  }, []);

  const getElapsed = () => (state ? state.elapsedMs + (state.status === 'running' ? performance.now() - rx.current : 0) : 0);
  return { state, getElapsed };
}
