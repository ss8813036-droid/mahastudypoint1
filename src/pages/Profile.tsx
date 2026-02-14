import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Mail, GraduationCap, Shield } from "lucide-react";
import logo from "@/assets/logo.jpg";

export default function Profile() {
  const { user, profile, roles, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [semester, setSemester] = useState(profile?.semester?.toString() || "");
  const [branch, setBranch] = useState(profile?.branch || "");
  const [saving, setSaving] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        semester: semester ? parseInt(semester) : null,
        branch: branch || null,
      })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to update profile");
    else {
      toast.success("Profile updated!");
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6">
        <div className="text-center space-y-3">
          <img src={logo} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto" />
          <div>
            <h1 className="text-xl font-display font-bold">{profile?.full_name || "User"}</h1>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" /> {user.email}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {roles.map((role) => (
                <span key={role} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium capitalize">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-semibold">Profile Details</h2>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="bg-muted/50" maxLength={100} />
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Semester" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map((s) => (
                      <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch (e.g. Computer Engineering)" className="bg-muted/50" maxLength={100} />
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">Save</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{profile?.full_name || "Not set"}</span></div>
                <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-muted-foreground" /><span>Semester {profile?.semester || "—"} · {profile?.branch || "Not set"}</span></div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-muted-foreground" /><span className="capitalize">{roles.join(", ")}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/admin/users")}>
            Go to Admin Panel
          </Button>
        )}

        <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
