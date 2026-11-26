import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="page-shell">
      <EmptyState
        title="Page not found"
        description="The page or game you are looking for is unavailable. It may have been unpublished or moved."
        action={{ label: "Browse all games", href: "/games" }}
      />
    </div>
  );
}
