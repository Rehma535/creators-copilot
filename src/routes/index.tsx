import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/auth", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Sparkles className="h-5 w-5 animate-pulse text-primary" />
        <span>Loading Creator Copilot…</span>
      </div>
    </div>
  );
}
