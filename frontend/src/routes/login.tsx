import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthHydrated } from "@/lib/auth-hydration";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — CareerHub" }] }),
  component: LoginPage,
});

function LoginPage() {
  const login = useAuth((s) => s.login);
  const hydrated = useAuthHydrated();
  const isAuth = useAuth((s) => s.isAuthenticated);
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !isAuth) return;
    nav({ to: "/", replace: true });
  }, [hydrated, isAuth, nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      setLoading(true);
      try {
        const result = await login(email.trim(), password);
        if (result.ok) {
          toast.success("Welcome back!");
          nav({ to: "/" });
        } else {
          toast.error(result.error ?? "Invalid credentials");
        }
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-extrabold shadow-lg">
              C
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">CareerHub</h1>
              <p className="text-xs text-muted-foreground">by CMH Cloud Marketing Hub</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
