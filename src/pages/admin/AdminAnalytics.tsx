import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, Key, Eye } from "lucide-react";

export default function AdminAnalytics() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [users, courses, tokens, usedTokens, enrollments, views] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("tokens").select("id", { count: "exact", head: true }),
        supabase.from("tokens").select("id", { count: "exact", head: true }).eq("is_used", true),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("content_views").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count || 0,
        courses: courses.count || 0,
        tokens: tokens.count || 0,
        usedTokens: usedTokens.count || 0,
        enrollments: enrollments.count || 0,
        views: views.count || 0,
      };
    },
  });

  const stats = [
    { icon: Users, label: "Total Users", value: data?.users, color: "text-primary" },
    { icon: BookOpen, label: "Courses", value: data?.courses, color: "text-galaxy-cyan" },
    { icon: Key, label: "Total Tokens", value: data?.tokens, color: "text-warning" },
    { icon: Key, label: "Used Tokens", value: data?.usedTokens, color: "text-success" },
    { icon: Users, label: "Enrollments", value: data?.enrollments, color: "text-galaxy-purple" },
    { icon: Eye, label: "Content Views", value: data?.views, color: "text-primary" },
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
