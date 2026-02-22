import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Copy, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareCourseButtonProps {
  course: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string | null;
    semester?: number | null;
    subject?: string | null;
    description?: string | null;
  };
  variant?: "icon" | "button";
  className?: string;
}

export default function ShareCourseButton({ course, variant = "icon", className }: ShareCourseButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const courseUrl = `${window.location.origin}/courses/${course.id}`;
  const shareText = `📚 *${course.title}*\n${course.price > 0 ? `💰 ₹${course.price}` : "🆓 Free"}\n${course.semester ? `📖 Semester ${course.semester}` : ""}${course.subject ? ` · ${course.subject}` : ""}\n${course.description ? `\n${course.description.slice(0, 100)}${course.description.length > 100 ? "..." : ""}` : ""}\n\n👉 Enroll now: ${courseUrl}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(courseUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: `${course.title} - ${course.price > 0 ? `₹${course.price}` : "Free"}`,
          url: courseUrl,
        });
      } catch {}
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className={className}>
          <Share2 className="w-4 h-4" />
        </button>
      ) : (
        <Button variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
          <Share2 className="w-4 h-4 mr-1" />Share
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Share Course</DialogTitle>
          </DialogHeader>

          {/* Course Preview Card */}
          <div className="rounded-lg border border-border overflow-hidden">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-muted flex items-center justify-center">
                <span className="text-3xl">📚</span>
              </div>
            )}
            <div className="p-3">
              <p className="font-semibold text-sm">{course.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {course.semester ? `Sem ${course.semester}` : ""}{course.subject ? ` · ${course.subject}` : ""}
              </p>
              <p className="text-sm font-bold text-primary mt-1">
                {course.price > 0 ? `₹${course.price}` : "Free"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full gap-2" variant="outline" onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4 text-green-500" />
              Share on WhatsApp
            </Button>

            <Button className="w-full gap-2" variant="outline" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>

            {typeof navigator.share === "function" && (
              <Button className="w-full gap-2" variant="outline" onClick={handleNativeShare}>
                <Share2 className="w-4 h-4" />
                More Options
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
