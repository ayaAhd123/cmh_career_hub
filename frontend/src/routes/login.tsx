import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
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
  const isAuth = useAuth((s) => s.isAuthenticated);
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@cmh.ma");
  const [password, setPassword] = useState("1234");

  useEffect(() => {
    if (isAuth) nav({ to: "/" });
  }, [isAuth, nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      const result = await login(email, password);
      if (result.ok) {
        toast.success("Welcome back!");
        nav({ to: "/" });
      } else {
        toast.error(result.error ?? "Invalid credentials");
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
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
            <p className="text-xs text-center text-muted-foreground">
              Default: admin@cmh.ma / 1234
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
