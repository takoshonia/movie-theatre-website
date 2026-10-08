export default function SectionState({ status, error, onRetry, skeleton, children }) {
  if (status === "loading") return skeleton;
  if (status === "error") {
    return (
      <div className="section-error">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  return children;
}

export function HeroSkeleton() {
  return <div className="skeleton hero-skeleton" />;
}

export function CardRowSkeleton() {
  return (
    <div className="card-row">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="skeleton card-skeleton" key={index} />
      ))}
    </div>
  );
}
