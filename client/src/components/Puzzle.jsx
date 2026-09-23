import { useState, useMemo } from "react";

// Tap two tiles to swap them. Every swap is recorded and replayed + verified on the server.
export default function Puzzle({
  image,
  aspect,
  grid,
  initial,
  disabled,
  onSolved,
}) {
  const [order, setOrder] = useState(initial);
  const [sel, setSel] = useState(null);
  const [swaps, setSwaps] = useState([]);
  const [peek, setPeek] = useState(false);

  const tiles = useMemo(
    () =>
      Array.from({ length: grid * grid }, (_, v) => ({
        x: grid > 1 ? ((v % grid) / (grid - 1)) * 100 : 0,
        y: grid > 1 ? (Math.floor(v / grid) / (grid - 1)) * 100 : 0,
      })),
    [grid],
  );

  function tap(pos) {
    if (disabled) return;
    if (sel === null) return setSel(pos);
    if (sel === pos) return setSel(null);
    const next = [...order];
    [next[sel], next[pos]] = [next[pos], next[sel]];
    const nextSwaps = [...swaps, [sel, pos]];
    setOrder(next);
    setSwaps(nextSwaps);
    setSel(null);
    if (next.every((v, i) => v === i)) onSolved(nextSwaps);
  }

  return (
    <div className="board-wrap">
      <div
        className="board"
        style={{
          aspectRatio: aspect,
          width: `min(100%, calc(62vh * ${aspect}))`,
          gridTemplateColumns: `repeat(${grid}, 1fr)`,
          gridTemplateRows: `repeat(${grid}, 1fr)`,
        }}
      >
        {order.map((v, pos) => (
          <button
            key={pos}
            aria-label={`tile ${pos + 1}`}
            className={`tile ${sel === pos ? "sel" : ""} ${v === pos ? "ok" : ""}`}
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: `${grid * 100}% ${grid * 100}%`,
              backgroundPosition: `${tiles[v].x}% ${tiles[v].y}%`,
            }}
            onClick={() => tap(pos)}
          />
        ))}
        {peek && (
          <div className="peek" style={{ backgroundImage: `url(${image})` }} />
        )}
      </div>
      <div className="row gap">
        <button
          className="btn ghost"
          onPointerDown={() => setPeek(true)}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
        >
          Hold to peek
        </button>
        <span className="muted">Moves: {swaps.length}</span>
      </div>
    </div>
  );
}
