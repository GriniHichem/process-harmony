import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  title: string;
}

export function PdfViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  title,
}: PdfViewerDialogProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setCurrentPage(1);
      setLoading(false);
      setError(null);
    },
    []
  );

  const onDocumentLoadError = useCallback(() => {
    setLoading(false);
    setError("Impossible de charger le PDF.");
  }, []);

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setNumPages(0);
      setCurrentPage(1);
      setScale(1.2);
      setFullscreen(false);
      setLoading(true);
      setError(null);
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
              <FileText className="h-4 w-4" /> {title}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {numPages > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                    {currentPage} / {numPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(numPages, p + 1))
                    }
                    disabled={currentPage >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                    disabled={scale <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                    disabled={scale >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFullscreen((f) => !f)}
                title={fullscreen ? "Réduire" : "Plein écran"}
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto flex justify-center bg-muted/30 rounded-md border">
          {error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              {error}
            </div>
          ) : (
            pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground py-12">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Chargement du PDF…
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                />
              </Document>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
