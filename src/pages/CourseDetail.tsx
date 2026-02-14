import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, MessageSquare, Clock, Folder, FileText, Image, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [showPurchase, setShowPurchase] = useState(false);
  const [token, setToken] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;

  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: enrollment, refetch: refetchEnrollment } = useQuery({
    queryKey: ["enrollment", id, user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: folders } = useQuery({
    queryKey: ["folders", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("folders")
        .select("*")
        .eq("course_id", id!)
        .is("parent_id", null)
        .order("sort_order");
      return data || [];
    },
    enabled: !!id && !!enrollment,
  });

  const { data: content } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("content")
        .select("*")
        .eq("course_id", id!)
        .is("folder_id", null)
        .order("sort_order");
      return data || [];
    },
    enabled: !!id && !!enrollment,
  });

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  const handleWhatsApp = () => {
    if (!settings?.whatsapp_number) {
      toast.error("WhatsApp is not configured yet");
      return;
    }
    const msg = (settings.whatsapp_message_template || "")
      .replace("{course_name}", course?.title || "")
      .replace("{student_name}", user?.email || "");
    const url = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleRedeem = async () => {
    if (!token.trim()) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_token", { token_code: token.trim() });
    if (error) {
      toast.error(error.message);
    } else if (data && typeof data === "object") {
      const result = data as Record<string, unknown>;
      if (result.success) {
        toast.success(`Access granted to ${result.course_title}`);
        refetchEnrollment();
        setShowPurchase(false);
      } else {
        toast.error(String(result.error) || "Invalid token");
      }
    }
    setRedeeming(false);
    setToken("");
  };

  const isEnrolled = !!enrollment;

  if (!course) return <AppLayout><div className="p-4 text-center text-muted-foreground">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Hero */}
        <div className="relative">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt="" className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <Link to="/courses" className="absolute top-4 left-4 p-2 rounded-full glass-card">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="px-4 -mt-8 relative space-y-4">
          <div>
            <h1 className="text-xl font-display font-bold">{course.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>Sem {course.semester}</span>
              <span>·</span>
              <span>{course.subject}</span>
              {course.validity_days && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.validity_days}d</span>
                </>
              )}
            </div>
            {course.description && <p className="text-sm text-muted-foreground mt-2">{course.description}</p>}
          </div>

          {!isEnrolled && course.price > 0 ? (
            <Button className="w-full font-semibold" onClick={() => setShowPurchase(true)}>
              Buy Course · ₹{course.price}
            </Button>
          ) : !isEnrolled && course.price === 0 ? (
            <Button className="w-full font-semibold" onClick={() => setShowPurchase(true)}>
              Enroll Free
            </Button>
          ) : null}

          {/* Content - only if enrolled */}
          {isEnrolled && (
            <div className="space-y-3">
              <h2 className="text-base font-display font-semibold">Course Content</h2>
              {folders?.map((folder: any) => (
                <Link key={folder.id} to={`/courses/${id}/folder/${folder.id}`}>
                  <Card className="glass-card hover:glow-border transition-all">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Folder className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-sm font-medium">{folder.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {content?.map((item: any) => (
                <Link key={item.id} to={`/content/${item.id}`}>
                  <Card className="glass-card hover:glow-border transition-all">
                    <CardContent className="p-3 flex items-center gap-3">
                      {item.content_type === "pdf" ? (
                        <FileText className="w-5 h-5 text-destructive" />
                      ) : (
                        <Image className="w-5 h-5 text-galaxy-cyan" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.unit_name} · {item.chapter_name}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {(!folders || folders.length === 0) && (!content || content.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-8">No content yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Purchase Options</DialogTitle>
            <DialogDescription>Choose how you'd like to access this course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {settings?.whatsapp_enabled === "true" && (
              <Button variant="outline" className="w-full gap-2" onClick={handleWhatsApp}>
                <MessageSquare className="w-4 h-4 text-success" />
                Contact on WhatsApp
              </Button>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Have a token?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter token code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-muted/50"
                  maxLength={50}
                />
                <Button onClick={handleRedeem} disabled={redeeming || !token.trim()}>
                  Redeem
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
