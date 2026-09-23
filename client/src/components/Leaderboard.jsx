import { fmt } from "../api";

export default function Leaderboard({ rows, big = false }) {
  if (!rows?.length)
    return <p className="muted">No one has solved a puzzle yet.</p>;
  return (
    <table className={`table ${big ? "big" : ""}`}>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Roll No</th>
          <th>Solved</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.userId} className={r.rank <= 3 ? `top top${r.rank}` : ""}>
            <td>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
            <td>{r.name}</td>
            <td>{r.rollNo}</td>
            <td>{r.solved}</td>
            <td>{fmt(r.totalMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
