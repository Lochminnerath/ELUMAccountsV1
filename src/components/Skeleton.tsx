import './Skeleton.css';

/** Grey shapes where content is on its way, with a soft shimmer (still for reduced motion). */
export function Skeleton({ lines = 3, avatar = false, label = 'Loading' }: { lines?: number; avatar?: boolean; label?: string }) {
  return (
    <div className="skeleton" role="status">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton__row">
          {avatar && <span className="skeleton__shape skeleton__dot" />}
          <span className="skeleton__lines">
            <span className="skeleton__shape skeleton__line" style={{ width: `${[72, 56, 64, 48][i % 4]}%` }} />
            <span className="skeleton__shape skeleton__line skeleton__line--short" />
          </span>
        </div>
      ))}
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
