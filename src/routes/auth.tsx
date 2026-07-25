import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import studioImg from "@/assets/studio.jpg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Creator Copilot" },
      { name: "description", content: "Sign in or create your Creator Copilot account." },
      { property: "og:title", content: "Sign in — Creator Copilot" },
      { property: "og:description", content: "Sign in or create your Creator Copilot account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created! Let's set up your profile.");
        navigate({ to: "/profile", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* Left — form */}
      <div className="flex flex-col justify-between px-6 py-10 md:px-12 md:py-14">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary neon-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">Creator Copilot</span>
        </Link>

        <div className="mx-auto w-full max-w-sm py-10">
          <p className="text-sm text-muted-foreground">Your AI creative partner</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold gradient-text leading-tight">
            {mode === "login" ? "Welcome Back" : "Start Creating"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to keep creating."
              : "Build a profile and let AI draft your next post."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 border border-border">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                mode === "login" ? "gradient-primary text-white shadow" : "text-muted-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                mode === "signup" ? "gradient-primary text-white shadow" : "text-muted-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-input/60 border-border"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-input/60 border-border"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 gradient-primary text-white font-semibold neon-glow-hover border-0"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                "Log in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-cyan hover:underline"
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Creator Copilot</p>
      </div>

      {/* Right — image */}
      <div className="relative hidden md:block overflow-hidden">
        <img
          src={studioImg}
          alt="Creator studio with ring light and neon lighting"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0a0a0f]/20 to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 max-w-md">
          <p className="text-2xl font-bold text-white/95 leading-snug">
            Ship videos, reels, and posts <span className="gradient-text">faster than ever</span>.
          </p>
          <p className="mt-2 text-sm text-white/70">
            Personalized to your channel, niche, and voice.
          </p>
        </div>
      </div>
    </div>
  );
}
