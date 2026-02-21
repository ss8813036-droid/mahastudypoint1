import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

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
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPages = useRef<Set<number>>(new Set());

  // Pinch-to-zoom state
  const lastDistRef = useRef<number | null>(null);
  const baseZoomRef = useRef(1);

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

  // Load PDF
  useEffect(() => {
    if (item?.content_type === "pdf" && item.file_url) {
      const loadPdf = async () => {
        try {
          const doc = await pdfjsLib.getDocument(item.file_url).promise;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          renderedPages.current.clear();
        } catch (err) {
          console.error("Failed to load PDF:", err);
        }
      };
      loadPdf();
    }
  }, [item]);

  // Render a single page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderedPages.current.has(pageNum)) return;
    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;
    
    renderedPages.current.add(pageNum);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom * 1.5 });
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      renderedPages.current.delete(pageNum);
      console.error(`Failed to render page ${pageNum}:`, err);
    }
  }, [pdfDoc, zoom]);

  // Re-render all pages on zoom change
  useEffect(() => {
    if (!pdfDoc) return;
    renderedPages.current.clear();
    for (let i = 1; i <= totalPages; i++) {
      renderPage(i);
    }
  }, [pdfDoc, zoom, totalPages, renderPage]);

  // Pinch-to-zoom handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDistRef.current = Math.hypot(dx, dy);
        baseZoomRef.current = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastDistRef.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const scale = dist / lastDistRef.current;
        const newZoom = Math.min(3, Math.max(0.5, baseZoomRef.current * scale));
        setZoom(newZoom);
      }
    };

    const handleTouchEnd = () => {
      lastDistRef.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoom]);

  const setCanvasRef = useCallback((pageNum: number) => (el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNum, el);
    }
  }, []);

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
              <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
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
          <div className="flex flex-col items-center gap-2 pb-6 px-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <canvas
                key={pageNum}
                ref={setCanvasRef(pageNum)}
                className="max-w-full shadow-sm"
                style={{ touchAction: "pan-y" }}
                onContextMenu={(e) => e.preventDefault()}
              />
            ))}
            {totalPages === 0 && (
              <p className="text-sm text-muted-foreground py-12">Loading PDF...</p>
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
