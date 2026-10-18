"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="card mx-auto max-w-lg text-center">
      <h2 className="font-semibold">Something went wrong loading this page</h2>
      <p className="muted mt-1 text-sm">{error.message || "Unexpected error."} Your saved data is safe.</p>
      <button className="btn-primary mt-4" onClick={reset}>Try again</button>
    </div>
  );
}
