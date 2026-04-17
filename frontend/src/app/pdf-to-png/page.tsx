'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PDFToPNG() {
  const [file, setFile] = useState<File | null>(null);
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
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

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
        const viewport = page.getViewport({ scale: 2.0 }); // 2x for crisp quality

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (!context) throw new Error('Could not create canvas context');

        await page.render({ canvasContext: context, viewport } as any).promise;

        // PNG — lossless, supports transparency
        const dataUrl = canvas.toDataURL('image/png');
        urls.push(dataUrl);

        setProgress(Math.round((i / totalPages) * 100));
      }

      setDownloadUrls(urls);
      toast.success(`Converted ${totalPages} page${totalPages > 1 ? 's' : ''} to PNG!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to convert PDF. The file might be corrupted.');
      setError('Failed to convert the PDF. The file might be corrupted or protected.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">PDF to PNG</h1>
        <p className="text-lg text-muted-foreground">
          Convert every PDF page to a high-quality PNG image — lossless, transparent-background-ready, in your browser.
        </p>
      </div>

      <main className="w-full max-w-4xl">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
          <div className="space-y-8">

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
                    <p className="text-lg font-medium mb-2">Drag & drop a PDF to convert to PNG</p>
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
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10"
                >
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
                    <Loader className="h-4 w-4 mr-2 animate-spin" /> Rendering pages in browser...
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
                {uploading ? <span>Converting...</span> : <span>Convert to PNG</span>}
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
                    {downloadUrls.length} PNG image{downloadUrls.length > 1 ? 's' : ''} ready to download.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {downloadUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      download={`${file?.name.replace('.pdf', '')}_page_${index + 1}.png`}
                      className="inline-flex items-center justify-center gap-2 bg-card border border-green-500/30 text-green-600 dark:text-green-400 py-3 px-4 rounded-xl hover:bg-green-500/10 transition-colors font-medium text-sm"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Download Page {index + 1} (.png)</span>
                    </a>
                  ))}
                </div>

                <button
                  onClick={removeFile}
                  className="mt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  Convert another file
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
