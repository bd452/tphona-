import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Not found</h1>
        <p className="muted" style={{ margin: 0 }}>
          The requested tenant or route does not exist.
        </p>
        <Link href="/">Return home</Link>
      </section>
    </main>
  );
}
