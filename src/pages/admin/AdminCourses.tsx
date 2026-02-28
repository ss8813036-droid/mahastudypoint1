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
import { ArrowLeft, Plus, BookOpen, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminCourses() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [price, setPrice] = useState("0");
  const [validity, setValidity] = useState("");
  const [customValidity, setCustomValidity] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentMode, setPaymentMode] = useState("razorpay");

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").insert({
        title: title.trim(),
        description: description.trim() || null,
        semester: semester ? parseInt(semester) : null,
        subject: subject.trim() || null,
        price: parseFloat(price) || 0,
        validity_days: validity === "custom" ? (parseInt(customValidity) || null) : (validity && validity !== "lifetime" ? parseInt(validity) : null),
        payment_link: paymentLink.trim() || null,
        payment_mode: paymentMode,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course created!");
      setShowCreate(false);
      setTitle(""); setDescription(""); setSemester(""); setSubject(""); setPrice("0"); setValidity(""); setPaymentLink(""); setPaymentMode("razorpay");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLaunch = useMutation({
    mutationFn: async ({ id, launched }: { id: string; launched: boolean }) => {
      await supabase.from("courses").update({ is_launched: launched }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Updated!");
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
            <h1 className="text-lg font-display font-bold">Courses</h1>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1"><Plus className="w-4 h-4" />Create</Button>
        </div>

        <div className="space-y-3">
          {courses?.map((c: any) => (
            <Card key={c.id} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <Link to={`/admin/courses/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><BookOpen className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground">Sem {c.semester} · {c.subject} · ₹{c.price}</p>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => toggleLaunch.mutate({ id: c.id, launched: !c.is_launched })}>
                  {c.is_launched ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this course?")) deleteCourse.mutate(c.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Create Course</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course Title" className="bg-muted/50" maxLength={200} />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="bg-muted/50" maxLength={500} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={s.toString()}>Sem {s}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="bg-muted/50" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (₹)" className="bg-muted/50" min="0" />
              <Select value={validity} onValueChange={(v) => { setValidity(v); }}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Validity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">180 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="custom">Custom Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Payment Method</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="payment_link">Payment Link</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="none">Free (No Payment)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(paymentMode === "payment_link" || paymentMode === "both") && (
              <Input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="Payment Link (Pay Online URL)" className="bg-muted/50" maxLength={500} />
            )}
            <Button className="w-full" onClick={() => createCourse.mutate()} disabled={!title.trim()}>Create Course</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
