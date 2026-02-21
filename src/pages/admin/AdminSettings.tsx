import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Save, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  // Courses for chat toggle
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
      setWhatsappEnabled(settings.whatsapp_enabled === "true");
      setMaintenanceMode(settings.maintenance_mode === "true");
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
      ]);
      toast.success("All settings saved!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-display font-bold">Settings</h1>
        </div>
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-display font-semibold">WhatsApp Settings</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable WhatsApp</span>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>
            <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="WhatsApp Number (e.g. 919876543210)" className="bg-muted/50" maxLength={20} />
            <Input value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)} placeholder="Message template ({course_name}, {student_name})" className="bg-muted/50" maxLength={500} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-display font-semibold">App Settings</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">Maintenance Mode</span>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
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
