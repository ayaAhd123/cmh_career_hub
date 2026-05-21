import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, User, Lock, Database, Building2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — CareerHub" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);
  const changePassword = useAuth((s) => s.changePassword);
  const logout = useAuth((s) => s.logout);
  const nav = useNavigate();

  const reset = useStore((s) => s.resetSeed);
  const restore = useStore((s) => s.restoreCandidate);
  const hardDelete = useStore((s) => s.hardDeleteCandidate);
  const allCandidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const archived = useMemo(() => allCandidates.filter((c) => c.archived), [allCandidates]);

  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("Name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Invalid email");
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const savePassword = async () => {
    if (next !== confirmPwd) return toast.error("Passwords don't match");
    const r = await changePassword(current, next);
    if (!r.ok) return toast.error(r.error ?? "Failed");
    toast.success("Password changed");
    setCurrent(""); setNext(""); setConfirmPwd("");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
            nav({ to: "/login" });
          }}
        >
          <LogOut className="mr-1 h-4 w-4" /> Logout
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveProfile}>Save profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>New password</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
          </div>
          <Button onClick={savePassword} disabled={!current || !next || !confirmPwd}>
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> CMH — Cloud Marketing Hub</p>
          <p><span className="text-muted-foreground">Product:</span> CareerHub v1.0</p>
          <p><span className="text-muted-foreground">Default duration:</span> 5 weeks · 25 working days (locked)</p>
          <p><span className="text-muted-foreground">Modules per promotion:</span> 5 (standard)</p>
          <p><span className="text-muted-foreground">Passing threshold:</span> 2.5 / 5</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archive Management ({archived.length} archived)</CardTitle>
        </CardHeader>
        <CardContent>
          {archived.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived candidates.</p>
          ) : (
            <div className="space-y-2">
              {archived.map((c) => {
                const promo = promotions.find((p) => p.id === c.promotionId);
                return (
                  <div key={c.id} className="flex justify-between items-center border rounded-md p-3">
                    <div>
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.email} · {promo?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { restore(c.id); toast.success("Restored"); }}>
                        Restore
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm("Permanently delete?")) {
                          hardDelete(c.id);
                          toast.success("Deleted");
                        }
                      }}>Delete</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Reset all data? This cannot be undone.")) {
                reset();
                toast.success("Reset. Refresh to reseed sample data.");
              }
            }}
          >
            Reset all data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            All data is stored locally in your browser (localStorage).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
