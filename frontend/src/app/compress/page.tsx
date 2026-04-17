'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Archive } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CompressPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]); // Only take one file
    setError(null);
    setDownloadUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = () => {
    setFile(null);
    setDownloadUrl(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
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

        // Now compress the file
        const compressResponse = await fetch(`${apiBase}/compress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        });
        setProgress(75);

        if (compressResponse.ok) {
          const compressData = await compressResponse.json();
          setDownloadUrl(`${apiBase}/download/${compressData.downloadId}`);
          setProgress(100);
          toast.success('PDF compressed successfully!');
        } else {
          toast.error('Compression failed. Please try again.');
          setError('Compression failed. Please try again.');
        }
      } else {
        toast.error('Upload failed. Please check file size and try again.');
        setError('Upload failed. Please check file size and try again.');
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Compress PDF</h1>
        <p className="text-lg text-muted-foreground">Reduce the file size of your PDF while maintaining optimal quality.</p>
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
                    <Archive className="h-8 w-8 text-primary" />
                  </div>
                  {isDragActive ? (
                    <p className="text-lg font-medium text-primary">Drop the PDF file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Drag & drop a PDF file here, or click to select
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Maximum 1 file, up to 100MB
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
                  <div className="bg-violet-500/10 p-2 rounded-md">
                    <FileText className="h-6 w-6 text-violet-500" />
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
            {file && !downloadUrl && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-primary text-primary-foreground py-3.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                {uploading ? (
                  <span>Compressing PDF...</span>
                ) : (
                  <span>Compress PDF</span>
                )}
              </button>
            )}

            {/* Success Message */}
            {downloadUrl && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">PDF Compressed Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your optimized document is ready.</p>
                </div>
                <a
                  href={downloadUrl}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-8 rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-sm"
                  download
                >
                  <FileText className="h-5 w-5" />
                  <span>Download Compressed PDF</span>
                </a>
                <button
                  onClick={removeFile}
                  className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  Compress another file
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}