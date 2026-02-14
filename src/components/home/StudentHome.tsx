import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Award, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

export default function StudentHome() {
  const { profile } = useAuth();

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)");
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["launched-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_launched", true)
        .limit(6);
      return data || [];
    },
  });

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src={logo} alt="MahaStudyPoint" className="w-10 h-10 rounded-xl object-cover" />
        <div>
          <h1 className="text-lg font-display font-bold text-foreground">
            Hello, {profile?.full_name || "Student"} 👋
          </h1>
          <p className="text-xs text-muted-foreground">Engineering Made Easy</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: "Enrolled", value: enrollments?.length || 0, color: "text-primary" },
          { icon: Award, label: "Completed", value: 0, color: "text-success" },
          { icon: Clock, label: "In Progress", value: enrollments?.length || 0, color: "text-warning" },
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

      {/* My Courses */}
      {enrollments && enrollments.length > 0 && (
        <section>
          <h2 className="text-base font-display font-semibold mb-3">My Courses</h2>
          <div className="grid grid-cols-2 gap-3">
            {enrollments.map((enrollment: any) => (
              <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`}>
                <Card className="glass-card hover:glow-border transition-all overflow-hidden">
                  {enrollment.courses?.thumbnail_url && (
                    <img src={enrollment.courses.thumbnail_url} alt="" className="w-full h-24 object-cover" />
                  )}
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold truncate">{enrollment.courses?.title}</p>
                    <p className="text-[10px] text-muted-foreground">{enrollment.courses?.subject}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse Courses */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-semibold">Browse Courses</h2>
          <Link to="/courses" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {courses?.map((course: any) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="glass-card hover:glow-border transition-all overflow-hidden">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt="" className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-muted flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-3">
                  <p className="text-sm font-semibold truncate">{course.title}</p>
                  <p className="text-[10px] text-muted-foreground">Sem {course.semester} · {course.subject}</p>
                  <p className="text-xs font-bold text-primary mt-1">
                    {course.price > 0 ? `₹${course.price}` : "Free"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {courses?.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No courses available yet.</p>
        )}
      </section>
    </div>
  );
}
