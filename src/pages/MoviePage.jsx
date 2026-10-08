import { useParams } from "react-router-dom";

export default function MoviePage() {
  const { slug } = useParams();

  return (
    <section>
      <h1>Film detail</h1>
      <p>{slug}</p>
    </section>
  );
}
