import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Load PDF document
  useEffect(() => {
    if (item?.content_type === "pdf" && item.file_url) {
      const loadPdf = async () => {
        try {
          const doc = await pdfjsLib.getDocument(item.file_url).promise;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        } catch (err) {
          console.error("Failed to load PDF:", err);
        }
      };
      loadPdf();
    }
  }, [item]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || rendering) return;
    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: zoom * 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error("Failed to render page:", err);
    }
    setRendering(false);
  }, [pdfDoc, currentPage, zoom, rendering]);

  useEffect(() => {
    renderPage();
  }, [pdfDoc, currentPage, zoom]);

  if (!user) return <Navigate to="/auth" replace />;
  if (!item) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background no-screenshot">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-border/50">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
            <span className="text-sm font-medium truncate max-w-[180px]">{item.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {item.content_type === "pdf" && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(3, zoom + 0.25))}><ZoomIn className="w-4 h-4" /></Button>
              </>
            )}
            {item.allow_download && (
              <a href={item.file_url} download target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 relative" ref={containerRef}>
        {item.add_watermark && <Watermark username={profile?.full_name || user.email || "User"} />}
        
        {item.content_type === "pdf" ? (
          <div className="flex flex-col items-center pb-20">
            <div className="overflow-auto w-full flex justify-center p-2">
              <canvas
                ref={canvasRef}
                className="max-w-full"
                style={{ touchAction: "pan-y" }}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            {/* Page navigation */}
            {totalPages > 0 && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass-card rounded-full px-4 py-2 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium min-w-[60px] text-center">{currentPage} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-56px)] p-4">
            <img
              src={item.file_url}
              alt={item.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
