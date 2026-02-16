import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminEnrollments() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showGrant, setShowGrant] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: enrollments } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data: enrollData } = await supabase.from("enrollments").select("*, courses(title)");
      if (!enrollData) return [];

      // Fetch user names separately
      const userIds = [...new Set(enrollData.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p.full_name; });

      return enrollData.map((e) => ({
        ...e,
        user_name: profileMap[e.user_id] || "Unknown",
      }));
    },
  });

  const { data: users } = useQuery({
    queryKey: ["all-users-select"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["all-courses-select"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title");
      return data || [];
    },
  });

  const grantAccess = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enrollments").insert({ user_id: selectedUser, course_id: selectedCourse });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      toast.success("Access granted!");
      setShowGrant(false);
      setSelectedUser("");
      setSelectedCourse("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeAccess = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("enrollments").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      toast.success("Removed!");
    },
  });

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
            <h1 className="text-lg font-display font-bold">Enrollments</h1>
          </div>
          <Button size="sm" onClick={() => setShowGrant(true)} className="gap-1"><Plus className="w-4 h-4" />Grant</Button>
        </div>

        <div className="space-y-2">
          {enrollments?.map((e: any) => (
            <Card key={e.id} className="glass-card">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{e.user_name}</p>
                  <p className="text-[10px] text-muted-foreground">{e.courses?.title}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeAccess.mutate(e.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showGrant} onOpenChange={setShowGrant}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Grant Course Access</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select User" /></SelectTrigger>
              <SelectContent>{users?.map((u: any) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || "No name"}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select Course" /></SelectTrigger>
              <SelectContent>{courses?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="w-full" onClick={() => grantAccess.mutate()} disabled={!selectedUser || !selectedCourse}>Grant Access</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
