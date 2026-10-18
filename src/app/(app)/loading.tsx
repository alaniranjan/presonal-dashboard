export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
      <div className="h-72 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
