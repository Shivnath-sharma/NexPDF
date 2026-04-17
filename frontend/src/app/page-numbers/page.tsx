'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Hash } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';

export default function PageNumbersPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState('bottom-center');
  const [startingNumber, setStartingNumber] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    setError(null);
    setDownloadUrl(null);
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
    setDownloadUrl(null);
  };

  const handleAddNumbers = async () => {
    if (!file) {
      toast.error('Please select a PDF file');
      setError('Please select a PDF file');
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);
      
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      setProgress(50);
      
      const pages = pdfDoc.getPages();
      const fontSize = 12;
      const margin = 30;
      
      pages.forEach((page, index) => {
        const { width, height } = page.getSize();
        const text = String(startingNumber + index);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        
        let x = margin;
        let y = margin;
        
        if (position === 'bottom-center') {
          x = width / 2 - textWidth / 2;
        } else if (position === 'bottom-right') {
          x = width - margin - textWidth;
        } else if (position === 'bottom-left') {
          x = margin;
        } else if (position === 'top-center') {
          x = width / 2 - textWidth / 2;
          y = height - margin - fontSize;
        } else if (position === 'top-right') {
          x = width - margin - textWidth;
          y = height - margin - fontSize;
        } else if (position === 'top-left') {
          x = margin;
          y = height - margin - fontSize;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });
      
      setProgress(80);

      const pdfBytes = await pdfDoc.save();
      setProgress(100);

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      toast.success('Page numbers added successfully!');

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add page numbers.');
      setError('Failed to process the PDF. The file might be corrupted or protected.');
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Add Page Numbers</h1>
        <p className="text-lg text-muted-foreground">Number your PDF pages securely in your browser.</p>
      </div>

      <main className="w-full max-w-4xl">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
          <div className="space-y-8">
            
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

            {file && !downloadUrl && (
              <div className="space-y-6">
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

                <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Position
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    >
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Starting Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={startingNumber}
                      onChange={(e) => setStartingNumber(parseInt(e.target.value) || 1)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-destructive mr-3" />
                  <p className="text-destructive font-medium text-sm">{error}</p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-primary flex items-center">
                    <Loader className="h-4 w-4 mr-2 animate-spin"/> Processing in browser...
                  </span>
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

            {file && !downloadUrl && (
              <button
                onClick={handleAddNumbers}
                disabled={uploading}
                className="w-full bg-primary text-primary-foreground py-3.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                {uploading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Hash className="h-5 w-5" />
                    <span>Add Page Numbers</span>
                  </>
                )}
              </button>
            )}

            {downloadUrl && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Page Numbers Added!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your document has been numbered successfully.</p>
                </div>
                
                <div className="w-full flex flex-col sm:flex-row gap-3 mt-4">
                  <a
                    href={downloadUrl}
                    download={`numbered_${file?.name}`}
                    className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-xl hover:opacity-90 transition-opacity font-semibold flex items-center justify-center"
                  >
                    Download PDF
                  </a>
                  <button
                    onClick={removeFile}
                    className="flex-1 bg-card border border-border hover:bg-muted py-3 px-4 rounded-xl transition-colors font-medium text-foreground"
                  >
                    Process Another
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
