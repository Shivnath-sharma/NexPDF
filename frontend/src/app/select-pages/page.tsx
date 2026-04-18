'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText, Loader, ArrowLeft, Scissors, XCircle,
  CheckCircle, Download, Check, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

type Mode = 'remove' | 'extract';

interface PageData {
  id: number; // 1-based
  thumbnailUrl: string;
  selected: boolean;
}

export default function SelectPages() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [mode, setMode] = useState<Mode>('remove');
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
        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          loadedPages.push({
            id: i,
            thumbnailUrl: canvas.toDataURL('image/jpeg', 0.75),
            selected: false,
          });
        }
      }

      setPages(loadedPages);
      toast.success(`Loaded ${loadedPages.length} pages`);
    } catch (err) {
      console.error(err);
      setError('Failed to load the PDF. Make sure it is a valid, unprotected file.');
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

  const togglePage = (id: number) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = () => setPages(prev => prev.map(p => ({ ...p, selected: true })));
  const selectNone = () => setPages(prev => prev.map(p => ({ ...p, selected: false })));

  const selectedCount = pages.filter(p => p.selected).length;

  // Pages that will end up in the output
  const keepIndexes = mode === 'remove'
    ? pages.filter(p => !p.selected).map(p => p.id - 1)   // 0-based
    : pages.filter(p => p.selected).map(p => p.id - 1);   // 0-based

  const canProcess = selectedCount > 0 && keepIndexes.length > 0;

  const handleDownload = async () => {
    if (!file || !canProcess) return;
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const copiedPages = await newPdf.copyPages(srcPdf, keepIndexes);
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success(
        mode === 'remove'
          ? `Removed ${selectedCount} page${selectedCount > 1 ? 's' : ''}!`
          : `Extracted ${selectedCount} page${selectedCount > 1 ? 's' : ''}!`
      );
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
          <Scissors className="mr-3 h-10 w-10 text-primary" />
          Select PDF Pages
        </h1>
        <p className="text-lg text-muted-foreground">
          Remove specific pages from a PDF, or extract selected pages into a new file.
        </p>
      </div>

      <main className="w-full max-w-6xl">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10">

          {/* Upload */}
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
                <Scissors className="h-10 w-10 text-primary" />
              </div>
              <p className="text-xl font-medium mb-3">Upload PDF to Select Pages</p>
              <p className="text-sm text-muted-foreground">Drag & drop or click to select — max 50MB</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <div className="relative">
                <Loader className="h-12 w-12 text-primary animate-spin" />
                <Scissors className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
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

              {/* Mode toggle + info bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pages.length} pages •{' '}
                      {selectedCount > 0
                        ? `${selectedCount} page${selectedCount > 1 ? 's' : ''} selected`
                        : 'Click pages to select them'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {/* Mode switcher */}
                  <div className="flex items-center bg-background border border-border rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setMode('remove')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                        mode === 'remove'
                          ? 'bg-destructive text-destructive-foreground shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                    <button
                      onClick={() => setMode('extract')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                        mode === 'extract'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Extract
                    </button>
                  </div>

                  {/* Select helpers */}
                  <button onClick={selectAll} className="text-xs px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors font-medium">
                    Select All
                  </button>
                  <button onClick={selectNone} className="text-xs px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors font-medium text-muted-foreground">
                    Select None
                  </button>
                  <button onClick={reset} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Mode description callout */}
              <div className={`text-sm px-4 py-3 rounded-lg border font-medium flex items-center gap-2 ${
                mode === 'remove'
                  ? 'bg-destructive/5 border-destructive/20 text-destructive'
                  : 'bg-primary/5 border-primary/20 text-primary'
              }`}>
                {mode === 'remove' ? (
                  <><Trash2 className="h-4 w-4 shrink-0" /> Selected pages will be <strong>removed</strong> from the output. Unselected pages will be kept.</>
                ) : (
                  <><Scissors className="h-4 w-4 shrink-0" /> Only the <strong>selected pages</strong> will appear in the output file.</>
                )}
              </div>

              {/* Page grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-muted/20 border border-border rounded-xl max-h-[60vh] overflow-y-auto">
                {pages.map((page) => {
                  const isKept = mode === 'remove' ? !page.selected : page.selected;
                  return (
                    <button
                      key={page.id}
                      onClick={() => togglePage(page.id)}
                      className={`group relative flex flex-col items-center rounded-lg p-2 shadow-sm transition-all cursor-pointer border-2 ${
                        page.selected
                          ? mode === 'remove'
                            ? 'border-destructive bg-destructive/5'
                            : 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/30'
                      }`}
                    >
                      {/* Checkbox overlay top-left */}
                      <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        page.selected
                          ? mode === 'remove'
                            ? 'bg-destructive border-destructive'
                            : 'bg-primary border-primary'
                          : 'bg-background border-border group-hover:border-muted-foreground'
                      }`}>
                        {page.selected && <Check className="h-3 w-3 text-white" />}
                      </div>

                      {/* Will-be-removed overlay */}
                      {page.selected && mode === 'remove' && (
                        <div className="absolute inset-0 bg-destructive/20 rounded-lg z-10 flex items-center justify-center">
                          <Trash2 className="h-8 w-8 text-destructive drop-shadow" />
                        </div>
                      )}

                      {/* Thumbnail */}
                      <div className={`w-full aspect-[1/1.4] flex items-center justify-center overflow-hidden bg-muted rounded-md mb-2 transition-opacity ${
                        page.selected && mode === 'remove' ? 'opacity-40' : 'opacity-100'
                      }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.thumbnailUrl}
                          alt={`Page ${page.id}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      <span className={`text-xs font-medium ${
                        page.selected && mode === 'remove' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        Page {page.id}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sticky action bar */}
              <div className="flex flex-wrap justify-between items-center gap-4 bg-card border border-border p-4 rounded-xl sticky bottom-0 z-10 shadow-2xl">
                <div className="text-sm text-muted-foreground font-medium">
                  {!canProcess && selectedCount === 0 && 'Select pages above to get started.'}
                  {selectedCount > 0 && keepIndexes.length === 0 && (
                    <span className="text-destructive">⚠️ You can't remove all pages — keep at least one.</span>
                  )}
                  {canProcess && mode === 'remove' && `${keepIndexes.length} page${keepIndexes.length > 1 ? 's' : ''} will be in your output.`}
                  {canProcess && mode === 'extract' && `${keepIndexes.length} page${keepIndexes.length > 1 ? 's' : ''} will be extracted.`}
                </div>
                <button
                  onClick={handleDownload}
                  disabled={processing || !canProcess}
                  className={`py-3 px-10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all flex items-center gap-2 shadow-lg ${
                    mode === 'remove'
                      ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {processing ? (
                    <><Loader className="h-5 w-5 animate-spin" /><span>Processing...</span></>
                  ) : mode === 'remove' ? (
                    <><Trash2 className="h-5 w-5" /><span>Remove & Download</span></>
                  ) : (
                    <><Scissors className="h-5 w-5" /><span>Extract & Download</span></>
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
                <h3 className="text-2xl font-bold tracking-tight">
                  {mode === 'remove' ? 'Pages Removed!' : 'Pages Extracted!'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your new PDF is ready. It was processed entirely in your browser — nothing was uploaded.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <a
                  href={downloadUrl}
                  download={`${mode === 'remove' ? 'trimmed' : 'extracted'}_${file?.name}`}
                  className="bg-primary text-primary-foreground py-4 px-10 rounded-xl hover:opacity-90 transition-all font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="h-5 w-5" />
                  Download PDF
                </a>
                <button
                  onClick={reset}
                  className="bg-muted hover:bg-muted/80 py-4 px-10 rounded-xl transition-all font-bold text-foreground border border-border shadow-sm"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
