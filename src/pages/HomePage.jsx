import { useApp } from "../context/AppProvider";

export default function HomePage() {
  const { ready, error, filterOptions } = useApp();

  if (!ready) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <section>
      <h1>Home</h1>
      <p>Filter options loaded: {filterOptions.venues.length} venues.</p>
    </section>
  );
}
