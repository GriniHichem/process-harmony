import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  title: string;
}

export function ImageViewerDialog({ open, onOpenChange, imageUrl, title }: ImageViewerDialogProps) {
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setScale(1);
      setFullscreen(false);
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex flex-col transition-all duration-300",
          fullscreen
            ? "max-w-[100vw] w-[100vw] h-[100vh] rounded-none m-0"
            : "max-w-5xl w-[90vw] h-[85vh]"
        )}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> {title}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.25, s - 0.25))} disabled={scale <= 0.25}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(5, s + 0.25))} disabled={scale >= 5}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(f => !f)}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 rounded-md border">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="max-w-none transition-transform duration-200"
              style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
