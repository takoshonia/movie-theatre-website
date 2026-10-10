export default function SectionState({ status, error, onRetry, skeleton, children }) {
  if (status === "loading") return skeleton;
  if (status === "error") {
    return (
      <div className="error-box">
        <p>{error}</p>
        <button type="button" className="btn secondary" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  return children;
}

export function HeroSkeleton() {
  return (
    <section className="hero">
      <div className="hero-loading skeleton" />
    </section>
  );
}

export function CardRowSkeleton() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="skeleton" key={index} />
      ))}
    </div>
  );
}
