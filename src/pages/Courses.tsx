import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/use-app-settings";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Search } from "lucide-react";
import ShareCourseButton from "@/components/ShareCourseButton";
import { Link, Navigate } from "react-router-dom";

export default function Courses() {
  const { user } = useAuth();
  const { isEnabled } = useAppSettings();
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState<number | null>(null);

  const shareEnabled = isEnabled("share_enabled");

  if (!user) return <Navigate to="/auth" replace />;

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", search, semester],
    queryFn: async () => {
      let query = supabase.from("courses").select("*").eq("is_launched", true);
      if (semester) query = query.eq("semester", semester);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data } = await query.order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-display font-bold">Courses</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border/50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSemester(null)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${!semester ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            All
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <button
              key={sem}
              onClick={() => setSemester(sem)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${semester === sem ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Sem {sem}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass-card animate-pulse">
                <div className="h-24 bg-muted" />
                <CardContent className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{course.title}</p>
                        <p className="text-[10px] text-muted-foreground">Sem {course.semester} · {course.subject}</p>
                        <p className="text-xs font-bold text-primary mt-1">
                          {course.price > 0 ? `₹${course.price}` : "Free"}
                        </p>
                      </div>
                      {shareEnabled && (
                        <ShareCourseButton course={course} variant="icon" className="p-1.5 rounded-full hover:bg-muted transition-colors" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && courses?.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">No courses found.</p>
        )}
      </div>
    </AppLayout>
  );
}
