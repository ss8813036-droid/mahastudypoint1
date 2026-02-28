import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Save, MessageCircle, FileText, Shield, CreditCard, Share2, ZoomIn, UserPlus, KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // WhatsApp
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  // Admin Contact
  const [adminContactEmail, setAdminContactEmail] = useState("");
  const [adminContactWhatsapp, setAdminContactWhatsapp] = useState("");

  // App toggles
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [googleSigninEnabled, setGoogleSigninEnabled] = useState(true);
  const [forgotPasswordEnabled, setForgotPasswordEnabled] = useState(true);
  const [shareEnabled, setShareEnabled] = useState(true);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [signupEnabled, setSignupEnabled] = useState(true);

  // Watermark
  const [watermarkType, setWatermarkType] = useState("email");
  const [watermarkIntensity, setWatermarkIntensity] = useState("medium");
  const [watermarkPosition, setWatermarkPosition] = useState("diagonal");
  const [watermarkCount, setWatermarkCount] = useState("10");

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-chat"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, chat_enabled");
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || "");
      setWhatsappTemplate(settings.whatsapp_message_template || "");
      setWhatsappEnabled(settings.whatsapp_enabled !== "false");
      setMaintenanceMode(settings.maintenance_mode === "true");
      setRazorpayEnabled(settings.razorpay_enabled !== "false");
      setGoogleSigninEnabled(settings.google_signin_enabled !== "false");
      setForgotPasswordEnabled(settings.forgot_password_enabled !== "false");
      setShareEnabled(settings.share_enabled !== "false");
      setZoomEnabled(settings.zoom_enabled !== "false");
      setSignupEnabled(settings.signup_enabled !== "false");
      setWatermarkType(settings.watermark_type || "email");
      setWatermarkIntensity(settings.watermark_intensity || "medium");
      setWatermarkPosition(settings.watermark_position || "diagonal");
      setWatermarkCount(settings.watermark_count || "10");
    }
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });

  const toggleChat = useMutation({
    mutationFn: async ({ courseId, enabled }: { courseId: string; enabled: boolean }) => {
      const { error } = await supabase.from("courses").update({ chat_enabled: enabled }).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses-chat"] });
      toast.success("Chat setting updated!");
    },
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const saveAll = async () => {
    try {
      await Promise.all([
        saveSetting.mutateAsync({ key: "whatsapp_number", value: whatsappNumber }),
        saveSetting.mutateAsync({ key: "whatsapp_message_template", value: whatsappTemplate }),
        saveSetting.mutateAsync({ key: "whatsapp_enabled", value: whatsappEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "maintenance_mode", value: maintenanceMode ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "razorpay_enabled", value: razorpayEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "google_signin_enabled", value: googleSigninEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "forgot_password_enabled", value: forgotPasswordEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "share_enabled", value: shareEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "zoom_enabled", value: zoomEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "signup_enabled", value: signupEnabled ? "true" : "false" }),
        saveSetting.mutateAsync({ key: "watermark_type", value: watermarkType }),
        saveSetting.mutateAsync({ key: "watermark_intensity", value: watermarkIntensity }),
        saveSetting.mutateAsync({ key: "watermark_position", value: watermarkPosition }),
        saveSetting.mutateAsync({ key: "watermark_count", value: watermarkCount }),
      ]);
      toast.success("All settings saved!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const ToggleRow = ({ label, icon: Icon, checked, onChange }: { label: string; icon: any; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-display font-bold">Admin Settings</h1>
        </div>

        {/* Feature Toggles */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-1">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" /> Feature Controls
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Enable or disable app features globally.</p>
            <ToggleRow label="Razorpay Payment" icon={CreditCard} checked={razorpayEnabled} onChange={setRazorpayEnabled} />
            <ToggleRow label="Google Sign-In" icon={LogIn} checked={googleSigninEnabled} onChange={setGoogleSigninEnabled} />
            <ToggleRow label="Forgot Password" icon={KeyRound} checked={forgotPasswordEnabled} onChange={setForgotPasswordEnabled} />
            <ToggleRow label="User Signup" icon={UserPlus} checked={signupEnabled} onChange={setSignupEnabled} />
            <ToggleRow label="Share Course" icon={Share2} checked={shareEnabled} onChange={setShareEnabled} />
            <ToggleRow label="PDF/Image Zoom" icon={ZoomIn} checked={zoomEnabled} onChange={setZoomEnabled} />
            <ToggleRow label="Maintenance Mode" icon={Shield} checked={maintenanceMode} onChange={setMaintenanceMode} />
          </CardContent>
        </Card>

        {/* Watermark Settings */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" /> Watermark Settings
            </h2>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Watermark Content</label>
              <Select value={watermarkType} onValueChange={setWatermarkType}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">User Email</SelectItem>
                  <SelectItem value="name">User Name</SelectItem>
                  <SelectItem value="both">Name + Email</SelectItem>
                  <SelectItem value="none">No Watermark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Intensity / Opacity</label>
              <Select value={watermarkIntensity} onValueChange={setWatermarkIntensity}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light (20%)</SelectItem>
                  <SelectItem value="medium">Medium (40%)</SelectItem>
                  <SelectItem value="heavy">Heavy (60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Position / Layout</label>
              <Select value={watermarkPosition} onValueChange={setWatermarkPosition}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diagonal">Diagonal Grid</SelectItem>
                  <SelectItem value="center">Center Only</SelectItem>
                  <SelectItem value="corners">Four Corners</SelectItem>
                  <SelectItem value="grid">Straight Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Number of Watermarks: {watermarkCount}</label>
              <Slider
                value={[parseInt(watermarkCount) || 10]}
                onValueChange={(v) => setWatermarkCount(String(v[0]))}
                min={1}
                max={30}
                step={1}
                className="py-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp Settings
            </h2>
            <ToggleRow label="Enable WhatsApp" icon={MessageCircle} checked={whatsappEnabled} onChange={setWhatsappEnabled} />
            <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="WhatsApp Number (e.g. 919876543210)" className="bg-muted/50" maxLength={20} />
            <Input value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)} placeholder="Message template ({course_name}, {student_name})" className="bg-muted/50" maxLength={500} />
          </CardContent>
        </Card>

        {/* Chat Access Control */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-display font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Chat Access Control
            </h2>
            <p className="text-xs text-muted-foreground">Enable or disable chat for each course.</p>
            {courses?.length === 0 && <p className="text-xs text-muted-foreground">No courses yet.</p>}
            {courses?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-1">
                <span className="text-sm truncate flex-1 mr-2">{c.title}</span>
                <Switch
                  checked={c.chat_enabled !== false}
                  onCheckedChange={(enabled) => toggleChat.mutate({ courseId: c.id, enabled })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button className="w-full gap-2" onClick={saveAll}><Save className="w-4 h-4" />Save All Settings</Button>
      </div>
    </AppLayout>
  );
}
