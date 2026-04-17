'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Droplet } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';

export default function WatermarkPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
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

  const handleWatermark = async () => {
    if (!file) {
      toast.error('Please select a PDF file');
      setError('Please select a PDF file');
      return;
    }

    if (!watermarkText.trim()) {
      toast.error('Please enter watermark text');
      setError('Please enter watermark text');
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      // Load the PDF completely client-side!
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);
      
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Embed a standard font so we can accurately measure text width
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      setProgress(50);
      
      const pages = pdfDoc.getPages();
      
      // Stamp every page
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        
        // Calculate the diagonal length of the page
        const diagonal = Math.sqrt(width * width + height * height);
        
        // We want the text to span about 85% of the page's diagonal.
        const widthAtSize1 = font.widthOfTextAtSize(watermarkText, 1);
        const fontSize = (diagonal * 0.85) / widthAtSize1;
        
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        
        // Calculate angle of the diagonal from bottom-left to top-right
        const angleInRadians = Math.atan2(height, width);
        const angleInDegrees = angleInRadians * (180 / Math.PI);
        
        // Calculate perfect centering
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Offset to move the drawing anchor (bottom-left of text) so the text center is at (centerX, centerY)
        const offsetX = (textWidth / 2) * Math.cos(angleInRadians) - (textHeight / 2) * Math.sin(angleInRadians);
        const offsetY = (textWidth / 2) * Math.sin(angleInRadians) + (textHeight / 2) * Math.cos(angleInRadians);
        
        const startX = centerX - offsetX;
        const startY = centerY - offsetY;
        
        // Draw the text perfectly centered and angled
        page.drawText(watermarkText, {
          x: startX,
          y: startY,
          size: fontSize,
          font: font,
          color: rgb(0.5, 0.5, 0.5), // Gray
          opacity: 0.25, // 25% transparency
          rotate: degrees(angleInDegrees),
        });
      });
      
      setProgress(80);

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      setProgress(100);

      // Create a Blob and a URL to download it
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      toast.success('Watermark applied successfully!');

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to watermark the PDF.');
      setError('Failed to watermark the PDF. The file might be corrupted or protected.');
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Watermark PDF</h1>
        <p className="text-lg text-muted-foreground">Stamp an image or text over your PDF securely in your browser.</p>
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

            {/* Selected File & Settings */}
            {file && !downloadUrl && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-indigo-500/10 p-2 rounded-md">
                      <FileText className="h-6 w-6 text-indigo-500" />
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

                {/* Watermark Configuration */}
                <div className="space-y-3 bg-muted/20 p-5 rounded-xl border border-border">
                  <label className="block text-sm font-semibold text-foreground">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL"
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    maxLength={40}
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will be stamped diagonally across the center of every page.
                  </p>
                </div>
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

            {/* Action Button */}
            {file && !downloadUrl && (
              <button
                onClick={handleWatermark}
                disabled={uploading || !watermarkText.trim()}
                className="w-full bg-primary text-primary-foreground py-3.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                {uploading ? (
                  <span>Stamping...</span>
                ) : (
                  <>
                    <Droplet className="h-5 w-5" />
                    <span>Add Watermark</span>
                  </>
                )}
              </button>
            )}

            {/* Success Message */}
            {downloadUrl && (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Watermark Applied!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your document has been successfully stamped.</p>
                </div>
                
                <div className="w-full flex flex-col sm:flex-row gap-3 mt-4">
                  <a
                    href={downloadUrl}
                    download={`watermarked_${file?.name}`}
                    className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-xl hover:opacity-90 transition-opacity font-semibold flex items-center justify-center"
                  >
                    Download PDF
                  </a>
                  <button
                    onClick={removeFile}
                    className="flex-1 bg-card border border-border hover:bg-muted py-3 px-4 rounded-xl transition-colors font-medium text-foreground"
                  >
                    Watermark Another
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
