import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DocumentSkeleton() {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-neutral-800 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-neutral-800 rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-neutral-800 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="h-4 bg-neutral-800 rounded w-full animate-pulse" />
          <div className="h-4 bg-neutral-800 rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-neutral-800 rounded w-1/2 animate-pulse" />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="h-4 bg-neutral-800 rounded w-24 animate-pulse" />
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-neutral-800 rounded animate-pulse" />
            <div className="h-8 w-16 bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentSkeleton key={i} />
      ))}
    </div>
  );
}
