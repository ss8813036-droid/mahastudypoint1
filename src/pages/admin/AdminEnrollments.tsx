import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Users, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AdminEnrollments() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showGrant, setShowGrant] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: enrollments } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data: enrollData } = await supabase.from("enrollments").select("*, courses(title)");
      if (!enrollData) return [];
      const userIds = [...new Set(enrollData.map((e) => e.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
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
      toast.success("Student removed from course!");
    },
  });

  // Group enrollments by course
  const grouped = (enrollments || []).reduce((acc: Record<string, any[]>, e: any) => {
    const courseId = e.course_id;
    if (!acc[courseId]) acc[courseId] = [];
    acc[courseId].push(e);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).filter(([courseId]) => {
    if (filterCourse !== "all" && courseId !== filterCourse) return false;
    return true;
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

        {/* Filter by course */}
        <div className="flex gap-2">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="bg-muted/50 h-9 text-xs">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs bg-muted/50"
            />
          </div>
        </div>

        {/* Course-wise enrollment view */}
        <div className="space-y-3">
          {filteredGrouped.map(([courseId, students]: [string, any[]]) => {
            const courseName = students[0]?.courses?.title || "Unknown Course";
            const isExpanded = expandedCourse === courseId;
            const filteredStudents = students.filter((s) =>
              !searchTerm || s.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return (
              <Card key={courseId} className="glass-card overflow-hidden">
                <button
                  className="w-full p-3 flex items-center justify-between text-left"
                  onClick={() => setExpandedCourse(isExpanded ? null : courseId)}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{courseName}</p>
                      <p className="text-[10px] text-muted-foreground">{students.length} student{students.length !== 1 ? "s" : ""} enrolled</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {filteredStudents.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">No students match.</p>
                    )}
                    {filteredStudents.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.user_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Enrolled: {new Date(s.enrolled_at).toLocaleDateString()}
                            {s.expires_at && ` · Expires: ${new Date(s.expires_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            if (confirm(`Remove ${s.user_name} from ${courseName}?`)) {
                              removeAccess.mutate(s.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          {filteredGrouped.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No enrollments found.</p>
          )}
        </div>
      </div>

      {/* Grant Access Dialog */}
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
