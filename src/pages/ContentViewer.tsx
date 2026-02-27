import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/use-app-settings";
import { ArrowLeft, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

function Watermark({ text, intensity, position, count }: { text: string; intensity: string; position: string; count: number }) {
  const opacityMap: Record<string, string> = { light: "0.15", medium: "0.3", heavy: "0.5" };
  const opacity = opacityMap[intensity] || "0.3";

  const getPositions = () => {
    if (position === "center") {
      return [{ top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-30deg)" }];
    }
    if (position === "corners") {
      return [
        { top: "8%", left: "8%", transform: "rotate(-30deg)" },
        { top: "8%", right: "8%", left: "auto", transform: "rotate(-30deg)" },
        { bottom: "8%", top: "auto", left: "8%", transform: "rotate(-30deg)" },
        { bottom: "8%", top: "auto", right: "8%", left: "auto", transform: "rotate(-30deg)" },
      ];
    }
    // diagonal or grid
    const items: any[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      items.push({
        top: `${(row / rows) * 80 + 10}%`,
        left: `${(col / cols) * 80 + 10}%`,
        transform: position === "diagonal" ? "rotate(-30deg)" : "rotate(0deg)",
      });
    }
    return items;
  };

  const positions_list = getPositions();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {positions_list.map((pos, i) => (
        <span
          key={i}
          className="absolute text-xs font-medium select-none whitespace-nowrap"
          style={{
            ...pos,
            opacity,
            color: "currentColor",
            fontSize: "11px",
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

export default function ContentViewer() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { getValue } = useAppSettings();
  const [zoom, setZoom] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPages = useRef<Set<number>>(new Set());
  const renderingPages = useRef<Set<number>>(new Set());
  const lastDistRef = useRef<number | null>(null);
  const baseZoomRef = useRef(1);
  const zoomTimeoutRef = useRef<any>(null);

  const watermarkType = getValue("watermark_type", "email");
  const watermarkIntensity = getValue("watermark_intensity", "medium");
  const watermarkPosition = getValue("watermark_position", "diagonal");
  const watermarkCount = parseInt(getValue("watermark_count", "10")) || 10;
  const zoomEnabled = getValue("zoom_enabled", "true") !== "false";

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

  const getWatermarkText = () => {
    if (watermarkType === "email") return user?.email || "User";
    if (watermarkType === "name") return profile?.full_name || "User";
    if (watermarkType === "both") return `${profile?.full_name || ""} · ${user?.email || ""}`;
    return user?.email || "User";
  };

  useEffect(() => {
    if (item?.content_type === "pdf" && item.file_url) {
      const loadPdf = async () => {
        try {
          const doc = await pdfjsLib.getDocument(item.file_url).promise;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          renderedPages.current.clear();
          renderingPages.current.clear();
        } catch (err) {
          console.error("Failed to load PDF:", err);
        }
      };
      loadPdf();
    }
  }, [item]);

  const renderTasksRef = useRef<Map<number, any>>(new Map());

  const renderPage = useCallback(async (pageNum: number, currentZoom: number) => {
    if (!pdfDoc) return;
    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;

    // Cancel any in-progress render for this page
    const existingTask = renderTasksRef.current.get(pageNum);
    if (existingTask) {
      try { existingTask.cancel(); } catch {}
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: currentZoom * 1.5 });
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderTask = page.render({ canvasContext: context, viewport });
      renderTasksRef.current.set(pageNum, renderTask);
      await renderTask.promise;
      renderTasksRef.current.delete(pageNum);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error(`Failed to render page ${pageNum}:`, err);
      }
    }
  }, [pdfDoc]);

  useEffect(() => {
    if (!pdfDoc) return;
    renderedPages.current.clear();
    for (let i = 1; i <= totalPages; i++) {
      renderPage(i, zoom);
    }
  }, [pdfDoc, zoom, totalPages, renderPage]);

  useEffect(() => {
    if (!zoomEnabled) return;
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
        container.style.setProperty("--pinch-scale", String(newZoom / zoom));
        if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => {
          container.style.removeProperty("--pinch-scale");
          setZoom(newZoom);
        }, 200);
      }
    };
    const handleTouchEnd = () => { lastDistRef.current = null; };
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoom, zoomEnabled]);

  const setCanvasRef = useCallback((pageNum: number) => (el: HTMLCanvasElement | null) => {
    if (el) canvasRefs.current.set(pageNum, el);
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));

  if (!user) return <Navigate to="/auth" replace />;
  if (!item) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;

  const showWatermark = item.add_watermark && watermarkType !== "none";

  return (
    <div className="min-h-screen bg-background no-screenshot">
      <div className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-border/50">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => window.history.back()} className="p-1 shrink-0"><ArrowLeft className="w-5 h-5" /></button>
            <span className="text-sm font-medium truncate">{item.name}</span>
          </div>
          {item.content_type === "pdf" && zoomEnabled && (
            <div className="flex items-center gap-1 mx-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}><ZoomOut className="w-4 h-4" /></Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}><ZoomIn className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {item.allow_download && (
              <a href={item.file_url} download target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="pt-14 relative" ref={containerRef}>
        {item.content_type === "pdf" ? (
          <div className="flex flex-col items-center gap-2 pb-6 px-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} className="relative w-full flex justify-center">
                <canvas
                  ref={setCanvasRef(pageNum)}
                  className="max-w-full shadow-sm"
                  style={{ touchAction: "pan-y" }}
                  onContextMenu={(e) => e.preventDefault()}
                />
                {showWatermark && (
                  <Watermark text={getWatermarkText()} intensity={watermarkIntensity} position={watermarkPosition} count={watermarkCount} />
                )}
              </div>
            ))}
            {totalPages === 0 && <p className="text-sm text-muted-foreground py-12">Loading PDF...</p>}
          </div>
        ) : (
          <div className="relative flex items-center justify-center min-h-[calc(100vh-56px)] p-4">
            <img
              src={item.file_url}
              alt={item.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              style={{ transform: zoomEnabled ? `scale(${zoom})` : undefined }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
            {showWatermark && (
              <Watermark text={getWatermarkText()} intensity={watermarkIntensity} position={watermarkPosition} count={watermarkCount} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
