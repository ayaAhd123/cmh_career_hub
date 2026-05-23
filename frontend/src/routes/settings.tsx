import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import {
  deleteCandidateApi,
  fetchCandidates,
  restoreCandidateApi,
  type CandidateListItem,
} from "@/lib/candidate-api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, User, Lock, Database, Building2, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  const promotions = useStore((s) => s.promotions);
  const loadPromotions = useStore((s) => s.loadPromotions);
  const [archived, setArchived] = useState<CandidateListItem[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(true);

  const loadArchived = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const { data } = await fetchCandidates({ scope: "archived", sort: "name_asc" });
      setArchived(data);
    } catch {
      toast.error("Failed to load archived candidates");
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPromotions();
    void loadArchived();
  }, [loadPromotions, loadArchived]);

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
  const [profileTouched, setProfileTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmitProfile = profileTouched && !!name.trim() && emailValid;
  const canSubmitPassword = passwordTouched && !!current && !!next && !!confirmPwd;

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("Name required");
    if (!emailValid) return toast.error("Invalid email");
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      toast.success("Profile updated");
      setProfileTouched(false);
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const savePassword = async () => {
    if (next !== confirmPwd) return toast.error("Passwords don't match");
    const r = await changePassword(current, next);
    if (!r.ok) return toast.error(r.error ?? "Failed");
    toast.success("Password changed");
    setCurrent("");
    setNext("");
    setConfirmPwd("");
    setPasswordTouched(false);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitProfile) return;
    void saveProfile();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitPassword) return;
    void savePassword();
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
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => {
                    setProfileTouched(true);
                    setName(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setProfileTouched(true);
                    setEmail(e.target.value);
                  }}
                />
              </div>
            </div>
            <Button type="submit" disabled={!canSubmitProfile}>
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sun className="h-4 w-4" /> Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            <Sun className="mr-2 h-4 w-4" /> Light
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            <Moon className="mr-2 h-4 w-4" /> Dark
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => {
                  setPasswordTouched(true);
                  setCurrent(e.target.value);
                }}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => {
                    setPasswordTouched(true);
                    setNext(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => {
                    setPasswordTouched(true);
                    setConfirmPwd(e.target.value);
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              New password must be at least 12 characters and include uppercase, lowercase, a number, and a special character.
            </p>
            <Button type="submit" disabled={!canSubmitPassword}>
              Update password
            </Button>
          </form>
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
          {archivedLoading ? (
            <p className="text-sm text-muted-foreground">Loading archived candidates…</p>
          ) : archived.length === 0 ? (
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await restoreCandidateApi(c.id);
                            toast.success("Restored");
                            await loadArchived();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to restore");
                          }
                        }}
                      >
                        Restore
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the candidate.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                try {
                                  await deleteCandidateApi(c.id);
                                  toast.success("Deleted");
                                  await loadArchived();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed to delete");
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Data storage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Your account (name, email, password) and promotions are saved in the application database on the server.
          </p>
          <p>
            Profile and password changes on this page are applied immediately to your database record.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
