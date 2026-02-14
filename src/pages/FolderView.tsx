import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, FileText, Image, ChevronRight, ArrowLeft } from "lucide-react";

export default function FolderView() {
  const { courseId, folderId } = useParams();
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;

  const { data: folder } = useQuery({
    queryKey: ["folder", folderId],
    queryFn: async () => {
      const { data } = await supabase.from("folders").select("*").eq("id", folderId!).single();
      return data;
    },
  });

  const { data: subfolders } = useQuery({
    queryKey: ["subfolders", folderId],
    queryFn: async () => {
      const { data } = await supabase.from("folders").select("*").eq("parent_id", folderId!).order("sort_order");
      return data || [];
    },
  });

  const { data: content } = useQuery({
    queryKey: ["folder-content", folderId],
    queryFn: async () => {
      const { data } = await supabase.from("content").select("*").eq("folder_id", folderId!).order("sort_order");
      return data || [];
    },
  });

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to={folder?.parent_id ? `/courses/${courseId}/folder/${folder.parent_id}` : `/courses/${courseId}`} className="p-2 rounded-full glass-card">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-display font-bold truncate">{folder?.name || "Folder"}</h1>
        </div>

        <div className="space-y-3">
          {subfolders?.map((f: any) => (
            <Link key={f.id} to={`/courses/${courseId}/folder/${f.id}`}>
              <Card className="glass-card hover:glow-border transition-all">
                <CardContent className="p-3 flex items-center gap-3">
                  <Folder className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm font-medium">{f.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {content?.map((item: any) => (
            <Link key={item.id} to={`/content/${item.id}`}>
              <Card className="glass-card hover:glow-border transition-all">
                <CardContent className="p-3 flex items-center gap-3">
                  {item.content_type === "pdf" ? <FileText className="w-5 h-5 text-destructive" /> : <Image className="w-5 h-5 text-galaxy-cyan" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.unit_name} · {item.chapter_name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!subfolders || subfolders.length === 0) && (!content || content.length === 0) && (
            <p className="text-center text-muted-foreground text-sm py-8">This folder is empty.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
