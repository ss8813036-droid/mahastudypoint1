import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Key, BarChart3, Settings, Shield, DollarSign, FolderOpen } from "lucide-react";
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

      // Revenue estimate
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
        enrollments: enrollments.count || 0,
        revenue,
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
          { label: "Users", value: stats?.users, color: "text-primary", icon: Users },
          { label: "Courses", value: stats?.courses, color: "text-galaxy-cyan", icon: BookOpen },
          { label: "Revenue", value: stats?.revenue != null ? `₹${stats.revenue}` : undefined, color: "text-success", icon: DollarSign },
          { label: "Enrollments", value: stats?.enrollments, color: "text-warning", icon: Shield },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="glass-card">
            <CardContent className="p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
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
