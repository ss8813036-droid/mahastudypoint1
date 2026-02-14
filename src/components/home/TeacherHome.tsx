import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, FileText, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

export default function TeacherHome() {
  const { user, profile } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  if (!profile?.is_approved) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <img src={logo} alt="MahaStudyPoint" className="w-16 h-16 rounded-2xl object-cover" />
        <h2 className="text-xl font-display font-bold">Pending Approval</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your teacher account is awaiting admin approval. You'll be able to create courses once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MahaStudyPoint" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <h1 className="text-lg font-display font-bold">Teacher Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name}</p>
          </div>
        </div>
        <Link to="/teacher/courses/new">
          <Button size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> New
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: "Courses", value: courses?.length || 0, color: "text-primary" },
          { icon: Users, label: "Students", value: 0, color: "text-galaxy-cyan" },
          { icon: FileText, label: "Content", value: 0, color: "text-warning" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="glass-card">
            <CardContent className="p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className="text-xl font-bold font-display">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="text-base font-display font-semibold mb-3">My Courses</h2>
        {courses?.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No courses yet. Create your first course!</p>
        ) : (
          <div className="space-y-3">
            {courses?.map((course: any) => (
              <Link key={course.id} to={`/teacher/courses/${course.id}`}>
                <Card className="glass-card hover:glow-border transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground">Sem {course.semester} · {course.subject}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${course.is_launched ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                        {course.is_launched ? "Live" : "Draft"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
