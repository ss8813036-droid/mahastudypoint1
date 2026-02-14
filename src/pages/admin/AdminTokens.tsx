import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Key, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MSP-";
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default function AdminTokens() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [count, setCount] = useState("1");
  const [expiry, setExpiry] = useState("");

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: tokens } = useQuery({
    queryKey: ["admin-tokens"],
    queryFn: async () => {
      const { data } = await supabase.from("tokens").select("*, courses(title)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title");
      return data || [];
    },
  });

  const generateTokens = useMutation({
    mutationFn: async () => {
      const n = Math.min(parseInt(count) || 1, 100);
      const newTokens = Array.from({ length: n }, () => ({
        code: generateToken(),
        course_id: courseId,
        expires_at: expiry ? new Date(expiry).toISOString() : null,
        created_by: user!.id,
      }));
      const { error } = await supabase.from("tokens").insert(newTokens);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tokens"] });
      toast.success("Tokens generated!");
      setShowCreate(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("tokens").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tokens"] });
      toast.success("Token deleted");
    },
  });

  const exportTokens = () => {
    if (!tokens) return;
    const csv = "Code,Course,Used,Used By,Expires\n" +
      tokens.map((t: any) => `${t.code},${t.courses?.title || ""},${t.is_used},${t.used_by || ""},${t.expires_at || ""}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tokens.csv"; a.click();
  };

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
            <h1 className="text-lg font-display font-bold">Tokens</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportTokens}>Export</Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1"><Plus className="w-4 h-4" />Generate</Button>
          </div>
        </div>

        <div className="space-y-2">
          {tokens?.map((t: any) => (
            <Card key={t.id} className="glass-card">
              <CardContent className="p-3 flex items-center gap-3">
                <Key className={`w-4 h-4 ${t.is_used ? "text-muted-foreground" : "text-warning"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold">{t.code}</p>
                  <p className="text-[10px] text-muted-foreground">{t.courses?.title} · {t.is_used ? "Used" : "Active"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(t.code); toast.success("Copied!"); }}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteToken.mutate(t.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Generate Tokens</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select Course" /></SelectTrigger>
              <SelectContent>{courses?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} placeholder="Number of tokens" className="bg-muted/50" min="1" max="100" />
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="bg-muted/50" />
            <Button className="w-full" onClick={() => generateTokens.mutate()} disabled={!courseId}>Generate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
