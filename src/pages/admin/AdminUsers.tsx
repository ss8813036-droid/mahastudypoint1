import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Check, X, Search, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [passwordDialog, setPasswordDialog] = useState<{ userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (!profiles) return [];
      const userIds = profiles.map((p) => p.user_id);
      const { data: allRoles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      return profiles.map((p) => ({
        ...p,
        roles: (allRoles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
    },
  });

  const updateApproval = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string; approved: boolean }) => {
      await supabase.from("profiles").update({ is_approved: approved }).eq("user_id", userId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Updated!"); },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", "student");
      if (role !== "student") {
        await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role updated!"); },
  });

  const changePassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "change_password", userId, newPassword: password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordDialog(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to change password"),
  });

  const forceLogout = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "force_logout", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => toast.success("User logged out successfully!"),
    onError: (err: any) => toast.error(err.message || "Failed to force logout"),
  });

  const filtered = users?.filter((u: any) =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.branch?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-display font-bold">User Management</h1>
          <span className="ml-auto text-xs text-muted-foreground">{users?.length || 0} users</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border/50" />
        </div>

        <div className="space-y-3">
          {filtered.map((u: any) => {
            const roles: string[] = u.roles || [];
            const hasTeacher = roles.includes("teacher");
            const primaryRole = roles.includes("admin") ? "admin" : hasTeacher ? "teacher" : "student";
            return (
              <Card key={u.id} className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{u.full_name || "No name"}</p>
                      <p className="text-[10px] text-muted-foreground">Sem {u.semester || "—"} · {u.branch || "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      {roles.map((r: string) => (
                        <span key={r} className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                          r === "admin" ? "bg-destructive/20 text-destructive" :
                          r === "teacher" ? "bg-warning/20 text-warning" :
                          "bg-primary/20 text-primary"
                        }`}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select defaultValue={primaryRole}
                      onValueChange={(role) => changeRole.mutate({ userId: u.user_id, role })}>
                      <SelectTrigger className="h-8 text-xs bg-muted/50 flex-1 min-w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasTeacher && (
                      <Button size="sm" variant={u.is_approved ? "outline" : "default"} className="text-xs h-8"
                        onClick={() => updateApproval.mutate({ userId: u.user_id, approved: !u.is_approved })}>
                        {u.is_approved ? <><X className="w-3 h-3 mr-1" />Revoke</> : <><Check className="w-3 h-3 mr-1" />Approve</>}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-8"
                      onClick={() => { setPasswordDialog({ userId: u.user_id, name: u.full_name || "User" }); setNewPassword(""); }}>
                      <KeyRound className="w-3 h-3 mr-1" />Password
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Force logout ${u.full_name || "this user"}?`)) {
                          forceLogout.mutate(u.user_id);
                        }
                      }}
                      disabled={forceLogout.isPending}>
                      <LogOut className="w-3 h-3 mr-1" />Logout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!passwordDialog} onOpenChange={() => setPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password — {passwordDialog?.name}</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog(null)}>Cancel</Button>
            <Button
              disabled={newPassword.length < 8 || changePassword.isPending}
              onClick={() => passwordDialog && changePassword.mutate({ userId: passwordDialog.userId, password: newPassword })}
            >
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
