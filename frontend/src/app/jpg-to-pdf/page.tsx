'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, CheckCircle, XCircle, Loader, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function JPGToPDF() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles].slice(0, 20)); // Max 20 images
    setError(null);
    setDownloadUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB per image
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one image file');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const apiBase = `http://${window.location.hostname}:3001`;
      const response = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const fileIds = data.files.map((f: any) => f.id);
        setProgress(50);

        // Now convert to PDF
        const convertResponse = await fetch(`${apiBase}/jpg-to-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds }),
        });
        setProgress(75);

        if (convertResponse.ok) {
          const convertData = await convertResponse.json();
          setDownloadUrl(`${apiBase}/download/${convertData.downloadId}`);
          setProgress(100);
          toast.success('Images converted to PDF successfully!');
        } else {
          toast.error('Conversion failed. Please try again.');
          setError('Conversion failed. Please try again.');
        }
      } else {
        toast.error('Upload failed. Please check file sizes and try again.');
        setError('Upload failed. Please check file sizes and try again.');
      }
    } catch (error) {
      toast.error('Error processing files. Please ensure the backend is running.');
      setError('Error processing files. Please ensure backend is running.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setDownloadUrl(null);
    setError(null);
    setProgress(0);
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">JPG to PDF</h1>
        <p className="text-lg text-muted-foreground">Convert JPG, PNG, or GIF images to a single PDF document.</p>
      </div>

      <main className="w-full max-w-4xl">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
          <div className="space-y-8">
            {/* File Upload Area */}
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
                  <p className="text-lg font-medium text-primary">Drop the images here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop images here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Maximum 20 images, up to 10MB each
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected File */}
            {files.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Selected images ({files.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="bg-orange-500/10 p-2 rounded-md shrink-0">
                          <ImageIcon className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-full hover:bg-destructive/10 shrink-0"
                        title="Remove file"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={resetForm}
                  className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all images
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
            {!downloadUrl && (
              <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="w-full bg-primary text-primary-foreground py-3.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                {uploading ? (
                  <span>Converting...</span>
                ) : (
                  <span>Convert to PDF</span>
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
                  <h3 className="text-lg font-bold text-foreground">Images Converted Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your new PDF document is ready.</p>
                </div>
                <a
                  href={downloadUrl}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-8 rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-sm"
                  download
                >
                  <FileText className="h-5 w-5" />
                  <span>Download PDF</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}