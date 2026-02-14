import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function Chat() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: enrollments } = useQuery({
    queryKey: ["chat-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(id, title)")
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
        .limit(100);
      setMessages(data || []);
    };
    loadMessages();

    const channel = supabase
      .channel(`chat-${selectedCourse}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `course_id=eq.${selectedCourse}` },
        async (payload) => {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", payload.new.user_id)
            .single();
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

  const sendMessage = async () => {
    if (!message.trim() || !selectedCourse) return;
    const { error } = await supabase.from("chat_messages").insert({
      course_id: selectedCourse,
      user_id: user.id,
      message: message.trim(),
    });
    if (error) toast.error("Failed to send");
    setMessage("");
  };

  if (!selectedCourse) {
    return (
      <AppLayout>
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-display font-bold">Chat</h1>
          {!enrollments || enrollments.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">Enroll in a course to join its chat.</p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e: any) => (
                <button key={e.id} onClick={() => setSelectedCourse(e.course_id)} className="w-full">
                  <Card className="glass-card hover:glow-border transition-all">
                    <CardContent className="p-4 flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">{e.courses?.title}</span>
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

  const courseName = enrollments?.find((e: any) => e.course_id === selectedCourse)?.courses?.title;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="p-3 glass-card border-b border-border/50 flex items-center gap-2">
          <button onClick={() => setSelectedCourse(null)} className="text-muted-foreground hover:text-foreground">←</button>
          <h2 className="text-sm font-display font-semibold truncate">{courseName}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg: any) => {
            const isOwn = msg.user_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.is_announcement ? "bg-primary/20 border border-primary/30" : isOwn ? "bg-primary text-primary-foreground" : "glass-card"}`}>
                  {!isOwn && <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{msg.profiles?.full_name || "User"}</p>}
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 glass-card border-t border-border/50">
          <div className="flex gap-2">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className="bg-muted/50" onKeyDown={(e) => e.key === "Enter" && sendMessage()} maxLength={1000} />
            <Button size="icon" onClick={sendMessage} disabled={!message.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
