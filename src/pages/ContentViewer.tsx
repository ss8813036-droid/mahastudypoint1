import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function Watermark({ username }: { username: string }) {
  const positions = Array.from({ length: 20 }, (_, i) => ({
    top: `${(i % 5) * 25 + 5}%`,
    left: `${Math.floor(i / 5) * 30 + 5}%`,
  }));
  return (
    <div className="watermark-overlay">
      {positions.map((pos, i) => (
        <span key={i} className="watermark-text" style={{ top: pos.top, left: pos.left }}>{username}</span>
      ))}
    </div>
  );
}

export default function ContentViewer() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [zoom, setZoom] = useState(100);

  const { data: item } = useQuery({
    queryKey: ["content-item", id],
    queryFn: async () => {
      const { data } = await supabase.from("content").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (item && user) {
      supabase.from("content_views").insert({ content_id: item.id, user_id: user.id });
    }
  }, [item, user]);

  if (!user) return <Navigate to="/auth" replace />;
  if (!item) return <div className="min-h-screen galaxy-gradient flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen galaxy-gradient no-screenshot">
      <div className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-border/50">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
            <span className="text-sm font-medium truncate max-w-[200px]">{item.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {item.content_type === "pdf" && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 25))}><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 25))}><ZoomIn className="w-4 h-4" /></Button>
              </>
            )}
            {item.allow_download && (
              <a href={item.file_url} download target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="pt-14 relative">
        {item.add_watermark && <Watermark username={profile?.full_name || user.email || "User"} />}
        {item.content_type === "pdf" ? (
          <iframe src={`${item.file_url}#toolbar=0&navpanes=0`} className="w-full" style={{ height: "calc(100vh - 56px)", transform: `scale(${zoom / 100})`, transformOrigin: "top center" }} title={item.name} />
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-56px)] p-4">
            <img src={item.file_url} alt={item.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" style={{ transform: `scale(${zoom / 100})` }} draggable={false} onContextMenu={(e) => e.preventDefault()} />
          </div>
        )}
      </div>
    </div>
  );
}
