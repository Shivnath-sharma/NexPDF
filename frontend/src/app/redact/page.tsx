'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, ShieldAlert, Trash2, Download, MousePointer2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb } from 'pdf-lib';
import { toast } from 'sonner';

interface RedactionBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageRedactions {
  pageIndex: number;
  boxes: RedactionBox[];
  width: number;
  height: number;
  thumbnailUrl: string;
}

export default function RedactPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageRedactions[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<RedactionBox | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!file || loading || downloadUrl) return;
      if (e.key === 'ArrowLeft') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, loading, downloadUrl, pages.length]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
    setLoading(true);
    setPages([]);
    setCurrentPageIndex(0);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      const loadedPages: PageRedactions[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        
        if (context) {
          await page.render({ canvasContext: context, viewport } as any).promise;
          loadedPages.push({
            pageIndex: i - 1,
            boxes: [],
            width: viewport.width,
            height: viewport.height,
            thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8)
          });
        }
      }
      setPages(loadedPages);
    } catch (err) {
      console.error(err);
      setError('Error loading PDF. Please try again.');
      toast.error('Failed to load PDF');
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentBox) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newWidth = x - startPos.x;
    const newHeight = y - startPos.y;

    setCurrentBox({
      ...currentBox,
      x: newWidth < 0 ? x : startPos.x,
      y: newHeight < 0 ? y : startPos.y,
      width: Math.abs(newWidth),
      height: Math.abs(newHeight)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 5 && currentBox.height > 5) {
      const newPages = [...pages];
      newPages[currentPageIndex].boxes.push(currentBox);
      setPages(newPages);
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeBox = (boxId: string) => {
    const newPages = [...pages];
    newPages[currentPageIndex].boxes = newPages[currentPageIndex].boxes.filter(b => b.id !== boxId);
    setPages(newPages);
  };

  const handleRedact = async () => {
    if (!file) return;
    
    const totalBoxes = pages.reduce((sum, p) => sum + p.boxes.length, 0);
    if (totalBoxes === 0) {
      toast.error('Please draw at least one redaction box');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfPages = pdfDoc.getPages();

      pages.forEach((pageData, idx) => {
        if (pageData.boxes.length > 0) {
          const pdfPage = pdfPages[idx];
          const { width, height } = pdfPage.getSize();
          
          const scaleX = width / pageData.width;
          const scaleY = height / pageData.height;

          pageData.boxes.forEach(box => {
            pdfPage.drawRectangle({
              x: box.x * scaleX,
              y: height - (box.y * scaleY) - (box.height * scaleY),
              width: box.width * scaleX,
              height: box.height * scaleY,
              color: rgb(0, 0, 0),
            });
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('PDF redacted successfully!');
    } catch (err: any) {
      console.error(err);
      setError('Error processing redaction. Please try again.');
      toast.error('Redaction failed');
    } finally {
      setProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPages([]);
    setDownloadUrl(null);
    setError(null);
    setCurrentPageIndex(0);
  };

  const currentPage = pages[currentPageIndex];

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-6xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 flex items-center justify-center">
          <ShieldAlert className="mr-3 h-10 w-10 text-primary" />
          Redact PDF
        </h1>
        <p className="text-lg text-muted-foreground italic">
          "Privacy is not an option, it is a right." - Securely blackout sensitive info.
        </p>
      </div>

      <main className="w-full max-w-6xl">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10">
          
          {!file && !loading && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="text-xl font-medium mb-3">Upload PDF to Redact</p>
                <p className="text-sm text-muted-foreground">Select sensitive areas by drawing black boxes over them.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <div className="relative">
                <Loader className="h-12 w-12 text-primary animate-spin" />
                <ShieldAlert className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-medium text-foreground">Preparing document for redaction...</p>
            </div>
          )}

          {file && !loading && !downloadUrl && currentPage && (
            <div className="flex flex-col space-y-8">
              <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">Drawing on Page {currentPageIndex + 1} of {pages.length}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center gap-8 min-h-[60vh]">
                {/* Prev Button */}
                <button
                  onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentPageIndex === 0}
                  className="bg-card border border-border p-3 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md z-20"
                >
                  <ChevronLeft className="h-8 w-8 text-foreground" />
                </button>

                {/* Page Viewer */}
                <div className="group relative shadow-2xl bg-white select-none transition-all duration-300">
                  <div className="absolute -top-8 left-0 right-0 flex justify-between items-center px-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Page {currentPageIndex + 1} / {pages.length}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newPages = [...pages];
                        newPages[currentPageIndex].boxes = [];
                        setPages(newPages);
                        toast.info(`Cleared Page ${currentPageIndex + 1}`);
                      }}
                      className="bg-card/90 backdrop-blur border border-border text-destructive px-2 py-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm text-[10px] font-bold uppercase"
                    >
                      Clear Page
                    </button>
                  </div>

                  <div 
                    className="relative cursor-crosshair overflow-hidden"
                    style={{ width: currentPage.width, height: currentPage.height }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={currentPage.thumbnailUrl} 
                      alt={`Page ${currentPageIndex + 1}`} 
                      className="pointer-events-none"
                    />
                    
                    {/* Existing Boxes */}
                    {currentPage.boxes.map(box => (
                      <div
                        key={box.id}
                        className="absolute bg-black/90 group/box"
                        style={{
                          left: box.x,
                          top: box.y,
                          width: box.width,
                          height: box.height
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBox(box.id);
                          }}
                          className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground p-2 rounded-full opacity-0 group-hover/box:opacity-100 transition-opacity shadow-xl border-2 border-background"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {/* Current Drawing Box */}
                    {isDrawing && currentBox && (
                      <div
                        className="absolute bg-black/70 border border-primary pointer-events-none"
                        style={{
                          left: currentBox.x,
                          top: currentBox.y,
                          width: currentBox.width,
                          height: currentBox.height
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                  disabled={currentPageIndex === pages.length - 1}
                  className="bg-card border border-border p-3 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md z-20"
                >
                  <ChevronRight className="h-8 w-8 text-foreground" />
                </button>
              </div>

              <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl sticky bottom-0 z-10 shadow-2xl">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <MousePointer2 className="h-4 w-4" />
                    <span>Use arrows or keys to navigate. Draw black boxes to redact.</span>
                 </div>
                 <button
                    onClick={handleRedact}
                    disabled={processing}
                    className="bg-primary text-primary-foreground py-3 px-10 rounded-xl hover:opacity-90 disabled:opacity-50 font-bold text-lg transition-all flex items-center space-x-2 shadow-lg"
                  >
                    {processing ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Applying Redaction...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-5 w-5" />
                        <span>Redact & Download</span>
                      </>
                    )}
                  </button>
              </div>
            </div>
          )}

          {downloadUrl && (
            <div className="p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col items-center text-center space-y-6">
              <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground tracking-tight">Redaction Complete!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Your sensitive information has been blacked out. The file remains 100% private.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center">
                <a
                  href={downloadUrl}
                  download={`redacted_${file?.name}`}
                  className="bg-primary text-primary-foreground py-4 px-10 rounded-xl hover:opacity-90 transition-all font-bold flex items-center justify-center shadow-lg hover:shadow-primary/30"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download PDF
                </a>
                <button
                  onClick={removeFile}
                  className="bg-muted hover:bg-muted/80 py-4 px-10 rounded-xl transition-all font-bold text-foreground border border-border shadow-sm"
                >
                  Start New
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
