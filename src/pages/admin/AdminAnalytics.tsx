import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, Key, Eye, DollarSign, FolderOpen } from "lucide-react";

export default function AdminAnalytics() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [users, courses, tokens, usedTokens, enrollments, views, content] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("tokens").select("id", { count: "exact", head: true }),
        supabase.from("tokens").select("id", { count: "exact", head: true }).eq("is_used", true),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("content_views").select("id", { count: "exact", head: true }),
        supabase.from("content").select("id", { count: "exact", head: true }),
      ]);

      // Calculate revenue from enrollments with course prices
      const { data: enrollData } = await supabase.from("enrollments").select("course_id");
      const { data: courseData } = await supabase.from("courses").select("id, price");
      let revenue = 0;
      if (enrollData && courseData) {
        const priceMap: Record<string, number> = {};
        courseData.forEach((c: any) => { priceMap[c.id] = c.price || 0; });
        enrollData.forEach((e: any) => { revenue += priceMap[e.course_id] || 0; });
      }

      return {
        users: users.count || 0,
        courses: courses.count || 0,
        tokens: tokens.count || 0,
        usedTokens: usedTokens.count || 0,
        enrollments: enrollments.count || 0,
        views: views.count || 0,
        content: content.count || 0,
        revenue,
      };
    },
  });

  const stats = [
    { icon: Users, label: "Total Users", value: data?.users, color: "text-primary" },
    { icon: BookOpen, label: "Courses", value: data?.courses, color: "text-galaxy-cyan" },
    { icon: DollarSign, label: "Est. Revenue", value: data?.revenue != null ? `₹${data.revenue}` : undefined, color: "text-success" },
    { icon: Users, label: "Enrollments", value: data?.enrollments, color: "text-galaxy-purple" },
    { icon: Key, label: "Total Tokens", value: data?.tokens, color: "text-warning" },
    { icon: Key, label: "Used Tokens", value: data?.usedTokens, color: "text-primary" },
    { icon: Eye, label: "Content Views", value: data?.views, color: "text-galaxy-cyan" },
    { icon: FolderOpen, label: "Total Content", value: data?.content, color: "text-muted-foreground" },
  ];

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-display font-bold">Analytics</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="glass-card">
              <CardContent className="p-4 text-center">
                <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                <p className="text-2xl font-bold font-display">{value ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
