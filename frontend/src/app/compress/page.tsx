'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Archive, Zap } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import { addHistoryItem } from '@/utils/history';

type Quality = 'low' | 'medium' | 'high';

const QUALITY_CONFIG: Record<Quality, { label: string; scale: number; jpeg: number; desc: string; color: string }> = {
  low:    { label: 'Low',    scale: 0.8,  jpeg: 0.45, desc: 'Smallest file — great for sharing', color: 'border-red-500 bg-red-500/10 text-red-500' },
  medium: { label: 'Medium', scale: 1.2,  jpeg: 0.70, desc: 'Balanced size & quality',           color: 'border-amber-500 bg-amber-500/10 text-amber-500' },
  high:   { label: 'High',   scale: 1.6,  jpeg: 0.88, desc: 'Best quality, smaller reduction',   color: 'border-green-500 bg-green-500/10 text-green-500' },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompressPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>('medium');
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    setOriginalSize(f.size);
    setDownloadUrl(null);
    setError(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
  });

  const handleCompress = async () => {
    if (!file) return;
    setCompressing(true);
    setError(null);
    setProgress(0);
    setDownloadUrl(null);

    try {
      const cfg = QUALITY_CONFIG[quality];

      // ── Load PDF with pdfjs ───────────────────────────────────────────────
      setProgressLabel('Loading PDF…');
      setProgress(5);
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      // pdfjs transfers (detaches) the ArrayBuffer to its worker — keep a copy for pdf-lib
      const arrayBufferForPdfLib = arrayBuffer.slice(0);
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;

      // ── Create new PDF ────────────────────────────────────────────────────
      const newPdf = await PDFDocument.create();
      const jpegDataUrls: string[] = [];

      // ── Re-render each page to JPEG ───────────────────────────────────────
      for (let i = 1; i <= numPages; i++) {
        setProgressLabel(`Rendering page ${i} of ${numPages}…`);
        setProgress(5 + Math.round(((i - 1) / numPages) * 75));

        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: cfg.scale });

        const canvas = document.createElement('canvas');
        // Guard against browser max canvas size (~16384px)
        const MAX_DIM = 4096;
        const scale = Math.min(
          cfg.scale,
          MAX_DIM / viewport.width,
          MAX_DIM / viewport.height
        );
        const safeViewport = page.getViewport({ scale });
        canvas.width = Math.floor(safeViewport.width);
        canvas.height = Math.floor(safeViewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas 2D context');

        // White background (JPEG has no transparency)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page as any).render({ canvasContext: ctx, viewport: safeViewport }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', cfg.jpeg);
        jpegDataUrls.push(dataUrl);
        // Free memory
        canvas.width = 0;
        canvas.height = 0;
      }

      // ── Embed JPEGs into new PDF ──────────────────────────────────────────
      setProgressLabel('Building compressed PDF…');
      setProgress(85);

      // Get original page dimensions for correct output sizing
      const originalPdf = await PDFDocument.load(arrayBufferForPdfLib);

      for (let i = 0; i < numPages; i++) {
        const jpegBytes = await fetch(jpegDataUrls[i]).then(r => r.arrayBuffer());
        const jpegImage = await newPdf.embedJpg(jpegBytes);

        // Use original page size so layout is preserved
        const origPage = originalPdf.getPages()[i];
        const { width, height } = origPage.getSize();

        const newPage = newPdf.addPage([width, height]);
        newPage.drawImage(jpegImage, { x: 0, y: 0, width, height });
      }

      setProgressLabel('Saving…');
      setProgress(95);

      const pdfBytes = await newPdf.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setCompressedSize(blob.size);
      setDownloadUrl(URL.createObjectURL(blob));
      setProgress(100);
      setProgressLabel('Done!');

      addHistoryItem('Compress PDF', file.name);
      toast.success(`Compressed ${formatBytes(file.size)} → ${formatBytes(blob.size)}!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to compress PDF.');
      toast.error('Compression failed.');
    } finally {
      setCompressing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setDownloadUrl(null);
    setError(null);
    setProgress(0);
    setProgressLabel('');
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const savings = originalSize && compressedSize
    ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
    : null;

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-4xl text-center mb-10">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Archive className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Compress PDF</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Reduce PDF file size significantly — right in your browser. No uploads, no servers, 100% private.
        </p>
      </div>

      <main className="w-full max-w-4xl space-y-5">

        {/* Drop zone */}
        {!file && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full transition-colors ${isDragActive ? 'bg-primary/20' : 'bg-muted'}`}>
                <Upload className={`h-9 w-9 transition-colors ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-lg font-bold mb-1">{isDragActive ? 'Drop your PDF!' : 'Drop a PDF or click to upload'}</p>
                <p className="text-sm text-muted-foreground">Up to 200 MB · All processing is 100% local</p>
              </div>
            </div>
          </div>
        )}

        {/* File + quality selection */}
        {file && !compressing && !downloadUrl && (
          <>
            {/* File row */}
            <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button onClick={reset} className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Quality selector */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Compression Quality</p>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(QUALITY_CONFIG) as [Quality, typeof QUALITY_CONFIG[Quality]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setQuality(key)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                      quality === key ? cfg.color : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <span className="text-base font-bold">{cfg.label}</span>
                    <span className="text-[11px] text-muted-foreground text-center leading-tight">{cfg.desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                ⚠️ Pages are re-rendered as images — text will not be selectable in the output PDF.
              </p>
            </div>

            <button
              onClick={handleCompress}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:opacity-90 text-primary-foreground py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-md"
            >
              <Zap className="h-5 w-5" /> Compress PDF
            </button>
          </>
        )}

        {/* Progress */}
        {compressing && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2 text-primary">
                <Loader className="h-4 w-4 animate-spin" /> {progressLabel}
              </span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {file?.name} · {QUALITY_CONFIG[quality].label} quality
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
            <XCircle className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        {/* Result */}
        {downloadUrl && savings !== null && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Stats bar */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              <div className="p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Original</p>
                <p className="text-xl font-bold">{formatBytes(originalSize)}</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Compressed</p>
                <p className="text-xl font-bold text-green-500">{formatBytes(compressedSize)}</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saved</p>
                <p className={`text-xl font-bold ${Number(savings) > 0 ? 'text-green-500' : 'text-orange-400'}`}>
                  {Number(savings) > 0 ? `-${savings}%` : `+${Math.abs(Number(savings))}%`}
                </p>
              </div>
            </div>

            <div className="p-6 flex flex-col sm:flex-row gap-3">
              <a
                href={downloadUrl}
                download={`compressed_${file?.name}`}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition-colors shadow-md shadow-green-500/20"
              >
                <CheckCircle className="h-5 w-5" /> Download Compressed PDF
              </a>
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted py-3.5 rounded-xl font-semibold text-muted-foreground transition-colors"
              >
                Compress Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}