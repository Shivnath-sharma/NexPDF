'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText, Loader, ArrowLeft, RotateCw, XCircle,
  CheckCircle, Download, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, degrees } from 'pdf-lib';
import { toast } from 'sonner';

interface PageData {
  id: number;
  thumbnailUrl: string;
  rotation: number; // current visual rotation (0, 90, 180, 270)
  width: number;
  height: number;
}

export default function RotatePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
    setLoading(true);
    setPages([]);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const loadedPages: PageData[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          loadedPages.push({
            id: i,
            thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
            rotation: 0,
            width: viewport.width,
            height: viewport.height,
          });
        }
      }

      setPages(loadedPages);
      toast.success(`Loaded ${loadedPages.length} pages`);
    } catch (err) {
      console.error(err);
      setError('Failed to load the PDF. Make sure it is a valid, unprotected PDF.');
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

  const rotatePage = (id: number, by: number = 90) => {
    setPages(prev =>
      prev.map(p =>
        p.id === id ? { ...p, rotation: (p.rotation + by + 360) % 360 } : p
      )
    );
  };

  const rotateAll = (by: number = 90) => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + by + 360) % 360 })));
    toast.info(`All pages rotated ${by > 0 ? 'clockwise' : 'counter-clockwise'}`);
  };

  const resetAll = () => {
    setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
    toast.info('All rotations reset');
  };

  const handleDownload = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfPages = pdfDoc.getPages();

      pages.forEach((pageData, idx) => {
        const currentAngle = pdfPages[idx].getRotation().angle;
        pdfPages[idx].setRotation(degrees((currentAngle + pageData.rotation) % 360));
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('PDF rotated successfully!');
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
  };

  const totalRotated = pages.filter(p => p.rotation !== 0).length;

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
          <RotateCw className="mr-3 h-10 w-10 text-primary" />
          Rotate PDF
        </h1>
        <p className="text-lg text-muted-foreground">
          Click any page to rotate it 90°, or rotate all pages at once. Everything stays in your browser.
        </p>
      </div>

      <main className="w-full max-w-6xl">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10">

          {/* Upload zone */}
          {!file && !loading && (
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
                <RotateCw className="h-10 w-10 text-primary" />
              </div>
              <p className="text-xl font-medium mb-3">Upload PDF to Rotate</p>
              <p className="text-sm text-muted-foreground">Drag & drop or click to select — max 50MB</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <div className="relative">
                <Loader className="h-12 w-12 text-primary animate-spin" />
                <RotateCw className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-medium">Rendering page thumbnails...</p>
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

          {/* Editor */}
          {file && !loading && !downloadUrl && pages.length > 0 && (
            <div className="flex flex-col space-y-6">
              {/* File info bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pages.length} pages •{' '}
                      {totalRotated > 0
                        ? `${totalRotated} page${totalRotated > 1 ? 's' : ''} rotated`
                        : 'Click a page to rotate it'}
                    </p>
                  </div>
                </div>

                {/* Bulk actions */}
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => rotateAll(90)}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                  >
                    <RotateCw className="h-4 w-4" />
                    Rotate All CW
                  </button>
                  <button
                    onClick={() => rotateAll(-90)}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                  >
                    <RotateCw className="h-4 w-4 scale-x-[-1]" />
                    Rotate All CCW
                  </button>
                  <button
                    onClick={resetAll}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors font-medium text-muted-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </button>
                  <button
                    onClick={reset}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Page grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-muted/20 border border-border rounded-xl max-h-[65vh] overflow-y-auto">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => rotatePage(page.id)}
                    className="group relative flex flex-col items-center bg-background border border-border rounded-lg p-2 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                    title="Click to rotate 90° clockwise"
                  >
                    {/* Rotation badge */}
                    {page.rotation !== 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {page.rotation}°
                      </span>
                    )}

                    {/* Rotate hint overlay */}
                    <div className="absolute inset-0 bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                      <RotateCw className="h-8 w-8 text-primary drop-shadow" />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-full aspect-[1/1.4] flex items-center justify-center overflow-hidden bg-muted rounded-md mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.thumbnailUrl}
                        alt={`Page ${page.id}`}
                        className="max-w-full max-h-full object-contain transition-transform duration-300"
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Page {page.id}</span>
                  </button>
                ))}
              </div>

              {/* Sticky action bar */}
              <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl sticky bottom-0 z-10 shadow-2xl">
                <p className="text-sm text-muted-foreground font-medium">
                  {totalRotated === 0 ? 'No changes yet — click pages above to rotate.' : `${totalRotated} page${totalRotated > 1 ? 's' : ''} will be rotated on download.`}
                </p>
                <button
                  onClick={handleDownload}
                  disabled={processing || totalRotated === 0}
                  className="bg-primary text-primary-foreground py-3 px-10 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all flex items-center gap-2 shadow-lg"
                >
                  {processing ? (
                    <><Loader className="h-5 w-5 animate-spin" /><span>Saving...</span></>
                  ) : (
                    <><RotateCw className="h-5 w-5" /><span>Download Rotated PDF</span></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {downloadUrl && (
            <div className="p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col items-center text-center space-y-6">
              <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">Rotation Applied!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your PDF has been rotated and is ready to download.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <a
                  href={downloadUrl}
                  download={`rotated_${file?.name}`}
                  className="bg-primary text-primary-foreground py-4 px-10 rounded-xl hover:opacity-90 transition-all font-bold flex items-center justify-center shadow-lg gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download PDF
                </a>
                <button
                  onClick={reset}
                  className="bg-muted hover:bg-muted/80 py-4 px-10 rounded-xl transition-all font-bold text-foreground border border-border shadow-sm"
                >
                  Rotate Another
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
