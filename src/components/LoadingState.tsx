export function LoadingState() {
  return (
    <div className="w-full max-w-2xl animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Image skeleton */}
      <div className="h-52 w-full bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-3 p-5">
        {/* Site info skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-sm bg-gray-200 dark:bg-gray-600" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-600" />
        </div>

        {/* Title skeleton */}
        <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-600" />
          <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-600" />
        </div>

        {/* URL skeleton */}
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-600" />
      </div>
    </div>
  );
}
