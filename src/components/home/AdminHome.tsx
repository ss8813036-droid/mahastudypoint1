import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Key, BarChart3, Settings, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

export default function AdminHome() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, courses, tokens, enrollments] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("tokens").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count || 0,
        courses: courses.count || 0,
        tokens: tokens.count || 0,
        enrollments: enrollments.count || 0,
      };
    },
  });

  const adminLinks = [
    { icon: Users, label: "Users", path: "/admin/users", color: "text-primary" },
    { icon: BookOpen, label: "Courses", path: "/admin/courses", color: "text-galaxy-cyan" },
    { icon: Key, label: "Tokens", path: "/admin/tokens", color: "text-warning" },
    { icon: BarChart3, label: "Analytics", path: "/admin/analytics", color: "text-success" },
    { icon: Settings, label: "Settings", path: "/admin/settings", color: "text-muted-foreground" },
    { icon: Shield, label: "Enrollments", path: "/admin/enrollments", color: "text-galaxy-purple" },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <img src={logo} alt="MahaStudyPoint" className="w-10 h-10 rounded-xl object-cover" />
        <div>
          <h1 className="text-lg font-display font-bold">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">MahaStudyPoint Management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Users", value: stats?.users, color: "text-primary" },
          { label: "Courses", value: stats?.courses, color: "text-galaxy-cyan" },
          { label: "Tokens", value: stats?.tokens, color: "text-warning" },
          { label: "Enrollments", value: stats?.enrollments, color: "text-success" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="glass-card">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold font-display ${color}`}>{value ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="text-base font-display font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {adminLinks.map(({ icon: Icon, label, path, color }) => (
            <Link key={path} to={path}>
              <Card className="glass-card hover:glow-border transition-all">
                <CardContent className="p-4 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                  <p className="text-xs font-medium">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
