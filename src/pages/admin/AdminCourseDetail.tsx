import { useState, useRef } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Folder, FileText, Image, Upload, Trash2, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function AdminCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<"pdf" | "image">("pdf");
  const [uploadFolderId, setUploadFolderId] = useState<string>("root");
  const [accessType, setAccessType] = useState<"free" | "paid">("paid");
  const [addWatermark, setAddWatermark] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Course edit fields
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editValidity, setEditValidity] = useState("");
  const [editCustomValidity, setEditCustomValidity] = useState("");
  const [editLaunched, setEditLaunched] = useState(false);
  const [editPaymentMode, setEditPaymentMode] = useState("razorpay");
  const [editPaymentLink, setEditPaymentLink] = useState("");

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: course, refetch: refetchCourse } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: folders } = useQuery({
    queryKey: ["admin-folders", id],
    queryFn: async () => {
      const { data } = await supabase.from("folders").select("*").eq("course_id", id!).order("sort_order");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: content } = useQuery({
    queryKey: ["admin-content", id],
    queryFn: async () => {
      const { data } = await supabase.from("content").select("*").eq("course_id", id!).order("sort_order");
      return data || [];
    },
    enabled: !!id,
  });

  const createFolder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("folders").insert({
        name: folderName.trim(), course_id: id!, parent_id: parentFolderId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-folders", id] });
      toast.success("Folder created!"); setShowAddFolder(false); setFolderName(""); setParentFolderId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => { await supabase.from("folders").delete().eq("id", folderId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-folders", id] }); toast.success("Folder deleted"); },
  });

  const deleteContent = useMutation({
    mutationFn: async (contentId: string) => { await supabase.from("content").delete().eq("id", contentId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-content", id] }); toast.success("Content deleted"); },
  });

  const updateCourse = useMutation({
    mutationFn: async () => {
      let validityDays: number | null = null;
      if (editValidity === "custom" && editCustomValidity) {
        validityDays = parseInt(editCustomValidity);
      } else if (editValidity && editValidity !== "none" && editValidity !== "custom") {
        validityDays = parseInt(editValidity);
      }
      const { error } = await supabase.from("courses").update({
        title: editTitle.trim(),
        price: parseFloat(editPrice) || 0,
        description: editDescription.trim() || null,
        validity_days: validityDays,
        is_launched: editLaunched,
        payment_mode: editPaymentMode,
        payment_link: editPaymentLink.trim() || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCourse(); toast.success("Course updated!"); setShowEditCourse(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditCourse = () => {
    if (!course) return;
    setEditTitle(course.title);
    setEditPrice(course.price?.toString() || "0");
    setEditDescription(course.description || "");
    const v = course.validity_days;
    if (!v) {
      setEditValidity("none");
      setEditCustomValidity("");
    } else if ([30, 90, 180, 365].includes(v)) {
      setEditValidity(v.toString());
      setEditCustomValidity("");
    } else {
      setEditValidity("custom");
      setEditCustomValidity(v.toString());
    }
    setEditLaunched(course.is_launched);
    setEditPaymentMode(course.payment_mode || "razorpay");
    setEditPaymentLink(course.payment_link || "");
    setShowEditCourse(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks
      const ext = selectedFile.name.split(".").pop();
      const filePath = `${id}/${Date.now()}.${ext}`;

      if (selectedFile.size > CHUNK_SIZE) {
        // Large file: upload in chunks with progress simulation
        const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
        let uploaded = 0;

        // For Supabase storage, we still do a single upload but track progress
        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener("error", () => reject(new Error("Upload failed")));

          const projectUrl = import.meta.env.VITE_SUPABASE_URL;
          const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          xhr.open("POST", `${projectUrl}/storage/v1/object/content/${filePath}`);
          xhr.setRequestHeader("Authorization", `Bearer ${(supabase as any).auth.session?.()?.access_token || apiKey}`);
          xhr.setRequestHeader("apikey", apiKey);
          xhr.setRequestHeader("x-upsert", "true");
          
          // Get the current session token
          supabase.auth.getSession().then(({ data }) => {
            const token = data.session?.access_token || apiKey;
            xhr.open("POST", `${projectUrl}/storage/v1/object/content/${filePath}`);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.setRequestHeader("apikey", apiKey);
            xhr.setRequestHeader("x-upsert", "true");
            xhr.send(selectedFile);
          });
        });

        await uploadPromise;
      } else {
        // Small file: standard upload
        setUploadProgress(30);
        const { error: uploadError } = await supabase.storage.from("content").upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        setUploadProgress(80);
      }

      const { data: { publicUrl } } = supabase.storage.from("content").getPublicUrl(filePath);

      const { error } = await supabase.from("content").insert({
        name: uploadName.trim(), course_id: id!,
        folder_id: uploadFolderId === "root" ? null : uploadFolderId,
        content_type: uploadType, file_url: publicUrl, file_size: selectedFile.size,
        access_type: accessType, add_watermark: addWatermark, allow_download: allowDownload,
        unit_name: unitName.trim() || null, chapter_name: chapterName.trim() || null,
        created_by: user!.id,
      });
      if (error) throw error;

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["admin-content", id] });
      toast.success("Content uploaded!"); setShowUpload(false); resetUploadForm();
    } catch (e: any) {
      toast.error(e.message || "Upload failed. Try a smaller file or check your connection.");
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const resetUploadForm = () => {
    setUploadName(""); setSelectedFile(null); setUploadType("pdf"); setUploadFolderId("root");
    setAccessType("paid"); setAddWatermark(true); setAllowDownload(false); setUnitName(""); setChapterName("");
  };

  const rootFolders = folders?.filter((f) => !f.parent_id) || [];
  const rootContent = content?.filter((c) => !c.folder_id) || [];

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!course) return <AppLayout showNav={false}><div className="p-4 text-center text-muted-foreground">Loading...</div></AppLayout>;

  return (
    <AppLayout showNav={false}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/courses" className="p-2 rounded-full glass-card"><ArrowLeft className="w-4 h-4" /></Link>
            <div>
              <h1 className="text-lg font-display font-bold truncate max-w-[200px]">{course.title}</h1>
              <p className="text-[10px] text-muted-foreground">
                Sem {course.semester} · {course.subject} · ₹{course.price}
                {course.is_launched ? " · 🟢 Live" : " · 🔴 Draft"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={openEditCourse} className="gap-1"><Edit2 className="w-3 h-3" />Edit</Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAddFolder(true)} className="gap-1 flex-1"><Folder className="w-3 h-3" />Add Folder</Button>
          <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1 flex-1"><Upload className="w-3 h-3" />Upload</Button>
        </div>

        {/* Folders */}
        {rootFolders.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-display font-semibold">Folders</h2>
            {rootFolders.map((f: any) => {
              const subfolders = folders?.filter((sf) => sf.parent_id === f.id) || [];
              const folderContent = content?.filter((c) => c.folder_id === f.id) || [];
              return (
                <Card key={f.id} className="glass-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-sm font-medium">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground">{subfolders.length + folderContent.length} items</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteFolder.mutate(f.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                    {folderContent.length > 0 && (
                      <div className="mt-2 ml-8 space-y-1">
                        {folderContent.map((c: any) => (
                          <div key={c.id} className="flex items-center gap-2 text-xs">
                            {c.content_type === "pdf" ? <FileText className="w-3 h-3 text-destructive" /> : <Image className="w-3 h-3 text-primary" />}
                            <span className="flex-1 truncate">{c.name}</span>
                            <span className="text-muted-foreground">{formatSize(c.file_size)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteContent.mutate(c.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {rootContent.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-display font-semibold">Content</h2>
            {rootContent.map((c: any) => (
              <Card key={c.id} className="glass-card">
                <CardContent className="p-3 flex items-center gap-3">
                  {c.content_type === "pdf" ? <FileText className="w-5 h-5 text-destructive" /> : <Image className="w-5 h-5 text-primary" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.access_type} · {formatSize(c.file_size)} · {c.add_watermark ? "Watermark" : "No WM"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteContent.mutate(c.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {rootFolders.length === 0 && rootContent.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p>No content yet. Create folders and upload content to get started.</p>
          </div>
        )}
      </div>

      {/* Edit Course Dialog */}
      <Dialog open={showEditCourse} onOpenChange={setShowEditCourse}>
        <DialogContent className="glass-card border-border/50 max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Course</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Course Title" className="bg-muted/50" />
            <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Price (₹)" type="number" className="bg-muted/50" />
            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="bg-muted/50" />
            
            {/* Validity */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Validity</label>
              <Select value={editValidity} onValueChange={(v) => { setEditValidity(v); if (v !== "custom") setEditCustomValidity(""); }}>
                <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Validity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Lifetime</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">180 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                  <SelectItem value="custom">Custom Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editValidity === "custom" && (
              <Input value={editCustomValidity} onChange={(e) => setEditCustomValidity(e.target.value)} placeholder="Number of days" type="number" min="1" className="bg-muted/50" />
            )}

            {/* Payment Mode */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Payment Method</label>
              <Select value={editPaymentMode} onValueChange={setEditPaymentMode}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="payment_link">Payment Link</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="none">Free (No Payment)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editPaymentMode === "payment_link" || editPaymentMode === "both") && (
              <Input value={editPaymentLink} onChange={(e) => setEditPaymentLink(e.target.value)} placeholder="Payment Link URL" className="bg-muted/50" maxLength={500} />
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm">Launch Course</span>
              <Switch checked={editLaunched} onCheckedChange={setEditLaunched} />
            </div>
            <Button className="w-full gap-2" onClick={() => updateCourse.mutate()} disabled={!editTitle.trim()}>
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Folder Dialog */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Create Folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Folder Name" className="bg-muted/50" maxLength={100} />
            <Select value={parentFolderId || "root"} onValueChange={(v) => setParentFolderId(v === "root" ? null : v)}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Parent Folder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root (No Parent)</SelectItem>
                {folders?.filter((f) => !f.parent_id).map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => createFolder.mutate()} disabled={!folderName.trim()}>Create Folder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Content Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="glass-card border-border/50 max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Upload Content</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Content Title" className="bg-muted/50" maxLength={200} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as "pdf" | "image")}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
              <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  {folders?.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Unit Name" className="bg-muted/50" maxLength={100} />
              <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="Chapter Name" className="bg-muted/50" maxLength={100} />
            </div>
            <Select value={accessType} onValueChange={(v) => setAccessType(v as "free" | "paid")}>
              <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <span className="text-sm">Add Watermark</span>
              <Switch checked={addWatermark} onCheckedChange={setAddWatermark} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Allow Download</span>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Tap to select file</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Max 500MB</p>
                </div>
              )}
              <input
                ref={fileInputRef} type="file" className="hidden"
                accept={uploadType === "pdf" ? ".pdf" : "image/*"}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{uploadProgress}% uploaded</p>
              </div>
            )}

            <Button className="w-full" onClick={handleUpload} disabled={uploading || !selectedFile || !uploadName.trim()}>
              {uploading ? "Uploading..." : "Upload Content"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
