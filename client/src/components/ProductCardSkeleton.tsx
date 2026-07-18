/*
 * Loading placeholder that mirrors ProductCard's footprint (w-220/240, image + text)
 * so product sections don't pop in jarringly while data is fetching.
 */
export default function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-3xl shadow-clay overflow-hidden flex flex-col w-[220px] sm:w-[240px] flex-shrink-0 animate-pulse">
      <div className="p-3 pt-8 bg-muted/70">
        <div className="w-full h-[180px] bg-muted rounded-2xl" />
      </div>
      <div className="px-3 pb-3 space-y-2 pt-2">
        <div className="h-2 bg-muted rounded w-16" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="flex gap-2 mt-2">
          <div className="h-4 bg-muted rounded w-12" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
        <div className="h-8 bg-muted rounded-full w-full mt-2" />
      </div>
    </div>
  );
}
