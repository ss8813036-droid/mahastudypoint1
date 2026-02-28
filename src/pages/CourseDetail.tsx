import { useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/use-app-settings";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, MessageSquare, Clock, Folder, FileText, Image, ChevronRight, ArrowLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ShareCourseButton from "@/components/ShareCourseButton";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isEnabled, settings } = useAppSettings();
  const [showPurchase, setShowPurchase] = useState(false);
  const [token, setToken] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [paying, setPaying] = useState(false);

  const razorpayEnabled = isEnabled("razorpay_enabled");
  const shareEnabled = isEnabled("share_enabled");
  const whatsappEnabled = isEnabled("whatsapp_enabled");

  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: enrollment, refetch: refetchEnrollment } = useQuery({
    queryKey: ["enrollment", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user!.id)
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

  const handleWhatsApp = () => {
    if (!settings?.whatsapp_number) {
      toast.error("WhatsApp is not configured yet");
      return;
    }
    const cleanNumber = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");
    const msg = (settings.whatsapp_message_template || "I want to buy {course_name}")
      .replace(/\{course_name\}/gi, course?.title || "")
      .replace(/\(\(course_name\)\)/gi, course?.title || "")
      .replace(/\{student_?name\}/gi, user?.email || "")
      .replace(/\{studentname\}/gi, user?.email || "");
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
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

  const handleRazorpayPayment = useCallback(async () => {
    if (!course || !user) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { courseId: course.id },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to create payment order");
        setPaying(false);
        return;
      }
      if (!(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "MahaStudyPoint",
        description: data.courseName,
        order_id: data.orderId,
        handler: async (response: any) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: course.id,
            },
          });
          if (verifyError || verifyData?.error) {
            toast.error(verifyData?.error || "Payment verification failed");
          } else {
            toast.success("Payment successful! Course access granted.");
            refetchEnrollment();
            setShowPurchase(false);
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
        prefill: { email: user.email },
        theme: { color: "#3B82F6" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay error:", err);
      toast.error("Payment initialization failed");
      setPaying(false);
    }
  }, [course, user, refetchEnrollment]);

  const isEnrolled = !!enrollment;

  if (!user) return <Navigate to="/auth" replace />;
  if (!course) return <AppLayout><div className="p-4 text-center text-muted-foreground">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
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
          {shareEnabled && (
            <ShareCourseButton course={course} variant="icon" className="absolute top-4 right-4 p-2 rounded-full glass-card" />
          )}
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

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Purchase Options</DialogTitle>
            <DialogDescription>Choose how you'd like to access this course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Razorpay button - show if course payment_mode allows it */}
            {course.price > 0 && razorpayEnabled && (course.payment_mode === "razorpay" || course.payment_mode === "both") && (
              <Button className="w-full gap-2" onClick={handleRazorpayPayment} disabled={paying}>
                <CreditCard className="w-4 h-4" />
                {paying ? "Processing..." : `Pay ₹${course.price} Online`}
              </Button>
            )}
            {/* Payment Link button */}
            {course.price > 0 && course.payment_link && (course.payment_mode === "payment_link" || course.payment_mode === "both") && (
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(course.payment_link!, "_blank")}>
                <CreditCard className="w-4 h-4" />
                Pay Online (Link)
              </Button>
            )}
            {whatsappEnabled && (
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
