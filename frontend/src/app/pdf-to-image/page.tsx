'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type ImageFormat = 'jpeg' | 'png' | 'webp';

const FORMAT_OPTIONS: { value: ImageFormat; label: string; ext: string; description: string }[] = [
  { value: 'jpeg', label: 'JPG', ext: 'jpg', description: 'Smaller file size, best for photos' },
  { value: 'png',  label: 'PNG', ext: 'png', description: 'Lossless quality, supports transparency' },
  { value: 'webp', label: 'WebP', ext: 'webp', description: 'Best quality-to-size ratio, modern format' },
];

export default function PDFToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [uploading, setUploading] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    setError(null);
    setDownloadUrls([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = () => {
    setFile(null);
    setDownloadUrls([]);
    setError(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      const urls: string[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context');

        await page.render({ canvasContext: context, viewport } as any).promise;

        // Quality only applies to jpeg/webp; PNG ignores it (always lossless)
        const quality = format === 'jpeg' ? 0.92 : 0.95;
        urls.push(canvas.toDataURL(`image/${format}`, quality));

        setProgress(Math.round((i / totalPages) * 100));
      }

      setDownloadUrls(urls);
      const selected = FORMAT_OPTIONS.find(f => f.value === format)!;
      toast.success(`Converted ${totalPages} page${totalPages > 1 ? 's' : ''} to ${selected.label}!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to convert PDF.');
      setError('Failed to convert the PDF. The file might be corrupted or protected.');
    } finally {
      setUploading(false);
    }
  };

  const selectedFormat = FORMAT_OPTIONS.find(f => f.value === format)!;

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">PDF to Image</h1>
        <p className="text-lg text-muted-foreground">
          Convert every PDF page to JPG, PNG, or WebP — lossless rendering, fully in your browser.
        </p>
      </div>

      <main className="w-full max-w-4xl space-y-6">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
          <div className="space-y-8">

            {/* Format Selector */}
            <div>
              <p className="text-sm font-semibold mb-3 text-foreground">Output Format</p>
              <div className="grid grid-cols-3 gap-3">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFormat(opt.value); setDownloadUrls([]); }}
                    className={`relative flex flex-col items-center gap-1 p-4 rounded-xl border-2 text-center transition-all ${
                      format === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 text-foreground'
                    }`}
                  >
                    <span className="font-bold text-lg">{opt.label}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
                    {format === opt.value && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload */}
            {!file && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                {isDragActive ? (
                  <p className="text-lg font-medium text-primary">Drop the PDF here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">Drag & drop a PDF to convert to {selectedFormat.label}</p>
                    <p className="text-sm text-muted-foreground">Maximum 1 file, up to 50MB</p>
                  </div>
                )}
              </div>
            )}

            {/* File info */}
            {file && (
              <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-sky-500/10 p-2 rounded-md">
                    <FileText className="h-6 w-6 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB → {selectedFormat.label}</p>
                  </div>
                </div>
                <button onClick={removeFile} className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive font-medium text-sm">{error}</p>
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-primary flex items-center">
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Rendering pages as {selectedFormat.label}...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Convert Button */}
            {file && !downloadUrls.length && (
              <button
                onClick={handleConvert}
                disabled={uploading}
                className="w-full bg-primary text-primary-foreground py-3.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {uploading ? <span>Converting...</span> : <span>Convert to {selectedFormat.label}</span>}
              </button>
            )}

            {/* Results */}
            {downloadUrls.length > 0 && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col space-y-4">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold">Converted Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {downloadUrls.length} {selectedFormat.label} image{downloadUrls.length > 1 ? 's' : ''} ready to download.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {downloadUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      download={`${file?.name.replace('.pdf', '')}_page_${index + 1}.${selectedFormat.ext}`}
                      className="inline-flex items-center justify-center gap-2 bg-card border border-green-500/30 text-green-600 dark:text-green-400 py-3 px-4 rounded-xl hover:bg-green-500/10 transition-colors font-medium text-sm"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Page {index + 1} (.{selectedFormat.ext})</span>
                    </a>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    onClick={() => { setDownloadUrls([]); }}
                    className="flex-1 text-sm font-medium border border-border rounded-xl py-2.5 hover:bg-muted transition-colors"
                  >
                    Change Format & Reconvert
                  </button>
                  <button
                    onClick={removeFile}
                    className="flex-1 text-sm font-medium border border-border rounded-xl py-2.5 hover:bg-muted transition-colors text-muted-foreground"
                  >
                    Convert Another File
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
