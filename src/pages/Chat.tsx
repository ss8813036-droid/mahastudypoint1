import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, MessageCircle, Megaphone } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function Chat() {
  const { user, isAdmin, isTeacher } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tab, setTab] = useState<"chat" | "announcements">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Admin/teacher see all courses, students see enrolled
  const { data: courseList } = useQuery({
    queryKey: ["chat-courses", user?.id, isAdmin, isTeacher],
    queryFn: async () => {
      if (isAdmin) {
        const { data } = await supabase.from("courses").select("id, title, chat_enabled");
        return (data || []).map((c: any) => ({ course_id: c.id, courses: c }));
      }
      if (isTeacher) {
        const { data } = await supabase.from("courses").select("id, title, chat_enabled").eq("created_by", user!.id);
        return (data || []).map((c: any) => ({ course_id: c.id, courses: c }));
      }
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, courses(id, title, chat_enabled)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!selectedCourse || !user) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles:user_id(full_name)")
        .eq("course_id", selectedCourse)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages(data || []);
    };
    loadMessages();

    const channel = supabase
      .channel(`chat-${selectedCourse}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `course_id=eq.${selectedCourse}` },
        async (payload) => {
          const { data } = await supabase.from("profiles").select("full_name").eq("user_id", payload.new.user_id).single();
          setMessages((prev) => [...prev, { ...payload.new, profiles: data }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCourse, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) return <Navigate to="/auth" replace />;

  const sendMessage = async (isAnnouncement = false) => {
    if (!message.trim() || !selectedCourse) return;
    const { error } = await supabase.from("chat_messages").insert({
      course_id: selectedCourse,
      user_id: user.id,
      message: message.trim(),
      is_announcement: isAnnouncement,
    });
    if (error) toast.error("Failed to send");
    setMessage("");
  };

  const selectedCourseData = courseList?.find((e: any) => e.course_id === selectedCourse)?.courses;
  const chatEnabled = selectedCourseData?.chat_enabled !== false;

  const filteredMessages = tab === "announcements"
    ? messages.filter((m) => m.is_announcement)
    : messages.filter((m) => !m.is_announcement);

  if (!selectedCourse) {
    return (
      <AppLayout>
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-display font-bold">Chat</h1>
          {!courseList || courseList.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">
              {isAdmin ? "No courses created yet." : "Enroll in a course to join its chat."}
            </p>
          ) : (
            <div className="space-y-3">
              {courseList.map((e: any) => (
                <button key={e.course_id} onClick={() => setSelectedCourse(e.course_id)} className="w-full">
                  <Card className="glass-card hover:glow-border transition-all">
                    <CardContent className="p-4 flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium flex-1 text-left">{e.courses?.title}</span>
                      {e.courses?.chat_enabled === false && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Disabled</span>
                      )}
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="p-3 glass-card border-b border-border/50 flex items-center gap-2">
          <button onClick={() => setSelectedCourse(null)} className="text-muted-foreground hover:text-foreground">←</button>
          <h2 className="text-sm font-display font-semibold truncate flex-1">{selectedCourseData?.title}</h2>
          {!chatEnabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Chat Off</span>}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-3 mt-2 w-auto">
            <TabsTrigger value="chat" className="text-xs gap-1"><MessageCircle className="w-3 h-3" />Chat</TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs gap-1"><Megaphone className="w-3 h-3" />Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredMessages.map((msg: any) => {
                const isOwn = msg.user_id === user.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isOwn ? "bg-primary text-primary-foreground" : "glass-card"}`}>
                      {!isOwn && <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{msg.profiles?.full_name || "User"}</p>}
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            {/* Chat input - only if enabled or admin */}
            {(chatEnabled || isAdmin) && (
              <div className="p-3 glass-card border-t border-border/50">
                <div className="flex gap-2">
                  <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className="bg-muted/50" onKeyDown={(e) => e.key === "Enter" && sendMessage(false)} maxLength={1000} />
                  <Button size="icon" onClick={() => sendMessage(false)} disabled={!message.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
            {!chatEnabled && !isAdmin && (
              <div className="p-3 text-center text-sm text-muted-foreground">Chat is disabled by admin.</div>
            )}
          </TabsContent>

          <TabsContent value="announcements" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredMessages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-12">No announcements yet.</p>
              )}
              {filteredMessages.map((msg: any) => (
                <div key={msg.id} className="w-full">
                  <div className="rounded-2xl px-4 py-3 bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="w-3 h-3 text-primary" />
                      <p className="text-[10px] text-primary font-semibold">{msg.profiles?.full_name || "Admin"}</p>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {/* Only admin can send announcements */}
            {isAdmin && (
              <div className="p-3 glass-card border-t border-border/50">
                <div className="flex gap-2">
                  <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Send announcement..." className="bg-muted/50" onKeyDown={(e) => e.key === "Enter" && sendMessage(true)} maxLength={1000} />
                  <Button size="icon" onClick={() => sendMessage(true)} disabled={!message.trim()} className="bg-primary">
                    <Megaphone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
