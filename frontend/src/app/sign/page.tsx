'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText, Loader, ArrowLeft, PenTool, XCircle,
  CheckCircle, Download, Eraser, MousePointer2, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

interface PageData {
  id: number;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export default function SignPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Upload, Step 2: Draw Signature, Step 3: Place Signature
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Signature Pad State
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Placement State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [signaturePosition, setSignaturePosition] = useState<{ x: number, y: number } | null>(null);
  const [signatureSize, setSignatureSize] = useState<{ width: number, height: number }>({ width: 150, height: 75 });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
    setLoading(true);
    setPages([]);
    setStep(2);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const loadedPages: PageData[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Load with a high enough scale for clear placing, but small enough to fit on screen
        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          loadedPages.push({
            id: i,
            thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height,
          });
        }
      }

      setPages(loadedPages);
    } catch (err) {
      console.error(err);
      setError('Failed to load the PDF. Make sure it is a valid, unprotected PDF.');
      toast.error('Failed to load PDF');
      setFile(null);
      setStep(1);
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

  // --- Signature Pad Logic ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;

    // Check if canvas is completely empty
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const hasContent = pixelBuffer.some(color => color !== 0);

    if (!hasContent) {
      toast.error('Please draw a signature before saving.');
      return;
    }

    // Determine bounds to crop whitespace
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    if (cropWidth > 0 && cropHeight > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth + 20; // add padding
        tempCanvas.height = cropHeight + 20;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.putImageData(ctx.getImageData(minX - 10, minY - 10, cropWidth + 20, cropHeight + 20), 0, 0);
            const dataUrl = tempCanvas.toDataURL('image/png');
            setSignatureDataUrl(dataUrl);
            setStep(3);
            return;
        }
    }

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setStep(3);
  };

  // --- Placement Logic ---
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Center the signature on the click
    setSignaturePosition({
      x: x - signatureSize.width / 2,
      y: y - signatureSize.height / 2
    });
  };

  const handleDownload = async () => {
    if (!file || !signatureDataUrl || !signaturePosition) {
        toast.error('Please place your signature on the document first.');
        return;
    }
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfPages = pdfDoc.getPages();
      const targetPage = pdfPages[currentPageIndex];
      const { width, height } = targetPage.getSize();

      // Convert data url to array buffer
      const pngImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(pngImageBytes);

      const currentPage = pages[currentPageIndex];

      // Calculate scale from preview to actual PDF dimensions
      const scaleX = width / currentPage.width;
      const scaleY = height / currentPage.height;

      const pdfSigWidth = signatureSize.width * scaleX;
      const pdfSigHeight = signatureSize.height * scaleY;

      const pdfPlacedX = signaturePosition.x * scaleX;
      const pdfPlacedY = signaturePosition.y * scaleY;

      targetPage.drawImage(pngImage, {
        x: pdfPlacedX,
        y: height - pdfPlacedY - pdfSigHeight, // Flip Y axis for pdf-lib (origin is bottom-left)
        width: pdfSigWidth,
        height: pdfSigHeight,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('PDF signed successfully!');
    } catch (err: any) {
      console.error(err);
      setError('Failed to process the PDF. Please try again.');
      toast.error('Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setDownloadUrl(null);
    setError(null);
    setStep(1);
    setSignatureDataUrl(null);
    setSignaturePosition(null);
  };

  // Setup Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 3 || !file || loading || downloadUrl) return;
      if (e.key === 'ArrowLeft') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, file, loading, downloadUrl, pages.length]);

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-6xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 flex items-center justify-center">
          <PenTool className="mr-3 h-10 w-10 text-primary" />
          Sign PDF
        </h1>
        <p className="text-lg text-muted-foreground">
          Draw your digital signature and stamp it securely onto your PDF.
        </p>
      </div>

      <main className="w-full max-w-6xl">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10">

          {/* Step 1: Upload */}
          {step === 1 && !loading && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <p className="text-xl font-medium mb-3">Upload PDF to Sign</p>
              <p className="text-sm text-muted-foreground">Drag & drop or click to select — max 50MB</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <div className="relative">
                <Loader className="h-12 w-12 text-primary animate-spin" />
                <PenTool className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-medium">Preparing document...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <p className="text-destructive font-medium">{error}</p>
              <button onClick={reset} className="mt-3 px-4 py-2 bg-background border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Try another file
              </button>
            </div>
          )}

          {/* Step 2: Draw Signature */}
          {step === 2 && !loading && (
             <div className="flex flex-col items-center space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Draw your signature</h2>
                    <p className="text-muted-foreground">Use your mouse or finger to sign below.</p>
                </div>

                <div className="relative w-full max-w-lg bg-white border-2 border-border rounded-xl shadow-inner overflow-hidden cursor-crosshair">
                    <canvas
                        ref={sigCanvasRef}
                        width={500}
                        height={250}
                        className="w-full h-[250px] touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={clearSignature}
                        className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground border border-border rounded-xl font-medium hover:bg-muted/80 transition-colors"
                    >
                        <Eraser className="w-5 h-5" />
                        Clear
                    </button>
                    <button
                        onClick={saveSignature}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                    >
                        <Check className="w-5 h-5" />
                        Save Signature
                    </button>
                </div>
                <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:underline mt-4">Cancel</button>
             </div>
          )}

          {/* Step 3: Place Signature */}
          {step === 3 && !loading && !downloadUrl && pages.length > 0 && (
            <div className="flex flex-col space-y-6">
              {/* Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                       Page {currentPageIndex + 1} of {pages.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setStep(2)} className="text-sm font-medium hover:underline text-muted-foreground">Redraw Signature</button>
                    <button onClick={reset} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors">
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>
              </div>

              {/* PDF Preview & Placement Area */}
              <div className="relative flex items-center justify-center gap-8 min-h-[60vh] bg-muted/10 rounded-xl p-4">
                 {/* Prev Button */}
                 <button
                  onClick={() => {
                      setCurrentPageIndex(prev => Math.max(0, prev - 1));
                      setSignaturePosition(null); // Reset position on page change
                  }}
                  disabled={currentPageIndex === 0}
                  className="bg-card border border-border p-3 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md z-20 shrink-0"
                >
                  <ChevronLeft className="h-8 w-8 text-foreground" />
                </button>

                <div className="relative shadow-2xl bg-white select-none transition-all duration-300 mx-auto border border-border/50">
                    <div className="absolute -top-8 left-0 right-0 flex justify-center items-center">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-border/50">
                            Page {currentPageIndex + 1}
                        </div>
                    </div>

                    <div
                        className="relative cursor-crosshair overflow-hidden"
                        style={{ width: pages[currentPageIndex].width, height: pages[currentPageIndex].height }}
                        onClick={handlePdfClick}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={pages[currentPageIndex].thumbnailUrl}
                            alt={`Page ${currentPageIndex + 1}`}
                            className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                        />

                        {/* Draggable/Placed Signature Overlay */}
                        {signaturePosition && signatureDataUrl && (
                            <div
                                className="absolute border border-primary/50 bg-primary/5 rounded cursor-move hover:bg-primary/10 transition-colors"
                                style={{
                                    left: signaturePosition.x,
                                    top: signaturePosition.y,
                                    width: signatureSize.width,
                                    height: signatureSize.height,
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={signatureDataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none opacity-90" />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                                    Click elsewhere to move
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => {
                      setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
                      setSignaturePosition(null);
                  }}
                  disabled={currentPageIndex === pages.length - 1}
                  className="bg-card border border-border p-3 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md z-20 shrink-0"
                >
                  <ChevronRight className="h-8 w-8 text-foreground" />
                </button>
              </div>

               {/* Action Bar */}
               <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl sticky bottom-0 z-10 shadow-2xl">
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4" />
                    {signaturePosition ? 'Ready to sign!' : 'Click anywhere on the document to place your signature.'}
                  </p>
                  <button
                    onClick={handleDownload}
                    disabled={processing || !signaturePosition}
                    className="bg-primary text-primary-foreground py-3 px-10 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all flex items-center gap-2 shadow-lg"
                  >
                    {processing ? (
                      <><Loader className="h-5 w-5 animate-spin" /><span>Signing...</span></>
                    ) : (
                      <><PenTool className="h-5 w-5" /><span>Sign & Download</span></>
                    )}
                  </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {downloadUrl && (
            <div className="p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col items-center text-center space-y-6">
              <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">PDF Signed Successfully!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your signature has been embedded into the PDF. It remains completely private and was processed entirely in your browser.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
                <a
                  href={downloadUrl}
                  download={`signed_${file?.name}`}
                  className="bg-primary text-primary-foreground py-4 px-10 rounded-xl hover:opacity-90 transition-all font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/30"
                >
                  <Download className="h-5 w-5" />
                  Download PDF
                </a>
                <button
                  onClick={reset}
                  className="bg-muted hover:bg-muted/80 py-4 px-10 rounded-xl transition-all font-bold text-foreground border border-border shadow-sm"
                >
                  Sign Another Document
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
