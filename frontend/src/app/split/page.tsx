'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Scissors } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SplitPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]); // Only take one file
    setError(null);
    setDownloadUrls([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = () => {
    setFile(null);
    setDownloadUrls([]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    if (!pages.trim()) {
      setError('Please specify pages to extract (e.g., 1,3-5,7)');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    const formData = new FormData();
    formData.append('files', file);

    try {
      const apiBase = `http://${window.location.hostname}:3001`;
      const response = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const fileId = data.files[0].id;
        setProgress(50);

        // Now split the file
        const splitResponse = await fetch(`${apiBase}/split`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, pages }),
        });
        setProgress(75);

        if (splitResponse.ok) {
          const splitData = await splitResponse.json();
          setDownloadUrls(splitData.downloadIds.map((id: string) => `${apiBase}/download/${id}`));
          setProgress(100);
          toast.success('PDF split successfully!');
        } else {
          toast.error('Split failed. Please try again.');
          setError('Split failed. Please try again.');
        }
      } else {
        toast.error('Upload failed. Please check file sizes and try again.');
        setError('Upload failed. Please check file sizes and try again.');
      }
    } catch (error) {
      toast.error('Error processing file. Please ensure backend is running.');
      setError('Error processing file. Please ensure backend is running.');
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Split PDF</h1>
        <p className="text-lg text-muted-foreground">Extract specific pages from your PDF or save each page as a separate PDF.</p>
      </div>

      <main className="w-full max-w-4xl">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
          <div className="space-y-8">
            {/* File Upload Area */}
            {!file && (
              <div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  {isDragActive ? (
                    <p className="text-lg font-medium text-primary">Drop the PDF file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Drag & drop a PDF file here, or click to select
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Maximum 1 file, up to 50MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected File */}
            {file && (
              <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-emerald-500/10 p-2 rounded-md">
                    <FileText className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10"
                  title="Remove file"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            )}

            {file && !downloadUrls.length && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Pages to extract
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Scissors className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder="e.g., 1,3-5,7"
                    className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Use comma-separated page numbers or ranges (e.g., 1,3-5,7)
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-destructive mr-3" />
                  <p className="text-destructive font-medium text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-primary flex items-center"><Loader className="h-4 w-4 mr-2 animate-spin"/> Processing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Button */}
            {file && !downloadUrls.length && (
              <button
                onClick={handleUpload}
                disabled={uploading || !pages.trim()}
                className="w-full bg-primary text-primary-foreground py-3.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                {uploading ? (
                  <span>Splitting PDF...</span>
                ) : (
                  <span>Split PDF</span>
                )}
              </button>
            )}

            {/* Success Message */}
            {downloadUrls.length > 0 && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col space-y-4">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">PDF Split Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your pages have been extracted.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {downloadUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      className="inline-flex items-center justify-center space-x-2 bg-card border border-green-500/30 text-green-600 dark:text-green-400 py-3 px-4 rounded-xl hover:bg-green-500/10 transition-colors font-medium text-sm"
                      download
                    >
                      <FileText className="h-4 w-4" />
                      <span>Download Part {index + 1}</span>
                    </a>
                  ))}
                </div>
                <button
                  onClick={removeFile}
                  className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  Split another file
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}