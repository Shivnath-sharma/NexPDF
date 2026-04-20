'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, Layers, RotateCw, Trash2, GripHorizontal, ZoomIn, X, Hash, Droplet, Settings2, Palette } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';

interface PageData {
  id: string;
  originalIndex: number;
  thumbnailUrl: string;
  rotation: number;
  deleted: boolean;
}

interface StudioOptions {
  addPageNumbers: boolean;
  pageNumberPosition: string;
  pageNumberStart: number;
  addWatermark: boolean;
  watermarkText: string;
  grayscale: boolean;
}

export default function OrganizePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

  const [options, setOptions] = useState<StudioOptions>({
    addPageNumbers: false,
    pageNumberPosition: 'bottom-center',
    pageNumberStart: 1,
    addWatermark: false,
    watermarkText: 'CONFIDENTIAL',
    grayscale: false,
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
    setLoading(true);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      const newPages: PageData[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport } as any).promise;
          newPages.push({
            id: `page-${i}-${Date.now()}`,
            originalIndex: i,
            thumbnailUrl: canvas.toDataURL('image/jpeg', 0.85),
            rotation: 0,
            deleted: false,
          });
        }
      }
      setPages(newPages);
    } catch (err) {
      console.error(err);
      setError('Error reading PDF for thumbnails. Please try again.');
      toast.error('Failed to generate thumbnails');
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

  const removeFile = () => {
    setFile(null);
    setPages([]);
    setDownloadUrl(null);
    setError(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDropEvent = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newPages = [...pages];
    const draggedItem = newPages[draggedIndex];
    newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, draggedItem);
    setPages(newPages);
    setDraggedIndex(null);
  };

  const rotatePage = (index: number) => {
    const newPages = [...pages];
    newPages[index].rotation = (newPages[index].rotation + 90) % 360;
    setPages(newPages);
  };

  const deletePage = (index: number) => {
    const newPages = [...pages];
    newPages[index].deleted = true;
    setPages(newPages);
    if (previewPageIndex === index) setPreviewPageIndex(null);
  };

  const handleSave = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const activePages = pages.filter(p => !p.deleted);
      if (activePages.length === 0) throw new Error('You cannot save an empty PDF.');

      const originalBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(originalBytes);
      const newPdf = await PDFDocument.create();

      if (options.grayscale) {
        toast.info('Applying grayscale (this may take a moment)...');
        // @ts-ignore
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

        const pdf = await pdfjsLib.getDocument(originalBytes).promise;
        
        for (const pageData of activePages) {
          const pdfPage = await pdf.getPage(pageData.originalIndex);
          const viewport = pdfPage.getViewport({ scale: 2.0 }); // 2.0 scale for high quality
          
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not create canvas context');

          await pdfPage.render({ canvasContext: ctx, viewport } as any).promise;

          // Desaturate
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            data[i] = data[i+1] = data[i+2] = avg;
          }
          ctx.putImageData(imageData, 0, 0);

          const pngDataUrl = canvas.toDataURL('image/png');
          const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer());
          const pngImage = await newPdf.embedPng(pngBytes);

          // We use the original page dimensions from pdf-lib so watermarks/page numbers align perfectly
          const sourcePage = sourcePdf.getPage(pageData.originalIndex - 1);
          const { width, height } = sourcePage.getSize();
          
          const newPage = newPdf.addPage([width, height]);
          newPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width,
            height,
          });

          if (pageData.rotation !== 0) {
            const currentRotation = sourcePage.getRotation().angle;
            newPage.setRotation(degrees(currentRotation + pageData.rotation));
          }
        }
      } else {
        const indicesToCopy = activePages.map(p => p.originalIndex - 1);
        const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);

        activePages.forEach((pageData, index) => {
          const copiedPage = copiedPages[index];
          if (pageData.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRotation + pageData.rotation));
          }
          newPdf.addPage(copiedPage);
        });
      }

      // --- Add Page Numbers ---
      if (options.addPageNumbers) {
        const font = await newPdf.embedFont(StandardFonts.Helvetica);
        const finalPages = newPdf.getPages();
        const fontSize = 12;
        const margin = 30;

        finalPages.forEach((page, index) => {
          const { width, height } = page.getSize();
          const text = String(options.pageNumberStart + index);
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          let x = margin, y = margin;

          if (options.pageNumberPosition === 'bottom-center') { x = width / 2 - textWidth / 2; }
          else if (options.pageNumberPosition === 'bottom-right') { x = width - margin - textWidth; }
          else if (options.pageNumberPosition === 'top-left') { y = height - margin - fontSize; }
          else if (options.pageNumberPosition === 'top-center') { x = width / 2 - textWidth / 2; y = height - margin - fontSize; }
          else if (options.pageNumberPosition === 'top-right') { x = width - margin - textWidth; y = height - margin - fontSize; }

          page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
        });
      }

      // --- Add Watermark ---
      if (options.addWatermark && options.watermarkText.trim()) {
        const font = await newPdf.embedFont(StandardFonts.HelveticaBold);
        const finalPages = newPdf.getPages();

        finalPages.forEach(page => {
          const { width, height } = page.getSize();
          const diagonal = Math.sqrt(width * width + height * height);
          const widthAtSize1 = font.widthOfTextAtSize(options.watermarkText, 1);
          const fontSize = (diagonal * 0.85) / widthAtSize1;
          const textWidth = font.widthOfTextAtSize(options.watermarkText, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          const angleInRadians = Math.atan2(height, width);
          const angleInDegrees = angleInRadians * (180 / Math.PI);
          const centerX = width / 2;
          const centerY = height / 2;
          const offsetX = (textWidth / 2) * Math.cos(angleInRadians) - (textHeight / 2) * Math.sin(angleInRadians);
          const offsetY = (textWidth / 2) * Math.sin(angleInRadians) + (textHeight / 2) * Math.cos(angleInRadians);

          page.drawText(options.watermarkText, {
            x: centerX - offsetX,
            y: centerY - offsetY,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity: 0.25,
            rotate: degrees(angleInDegrees),
          });
        });
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('PDF saved successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error processing the PDF.');
      toast.error(err.message || 'Error processing the PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const activePages = pages.filter(p => !p.deleted);
  const previewPage = previewPageIndex !== null ? pages[previewPageIndex] : null;

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      {/* Preview Modal */}
      {previewPage && previewPageIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            <div className="absolute -top-14 right-0 flex items-center gap-3 z-[101]">
              <button
                onClick={() => rotatePage(previewPageIndex)}
                className="bg-card border border-border text-foreground p-3 rounded-full hover:bg-muted transition-colors shadow-lg flex items-center gap-2"
                title="Rotate Page"
              >
                <RotateCw className="h-5 w-5" />
                <span className="text-sm font-medium pr-1">Rotate</span>
              </button>
              <button
                onClick={() => setPreviewPageIndex(null)}
                className="bg-card border border-border text-foreground p-3 rounded-full hover:bg-muted transition-colors shadow-lg"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-card p-2 rounded-xl shadow-2xl border border-border w-full flex justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPage.thumbnailUrl}
                alt={`Preview of Page ${previewPage.originalIndex}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg transition-transform duration-300"
                style={{ transform: `rotate(${previewPage.rotation}deg)` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-7xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">PDF Editor Studio</h1>
        <p className="text-lg text-muted-foreground">Reorder, rotate, delete pages — and apply watermarks or page numbers — all in one place.</p>
      </div>

      <main className="w-full max-w-7xl">
        {/* Upload */}
        {!file && !loading && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers className="h-10 w-10 text-primary" />
              </div>
              {isDragActive ? (
                <p className="text-xl font-medium text-primary">Drop the PDF file here...</p>
              ) : (
                <div>
                  <p className="text-xl font-medium mb-3">Drag & drop a PDF file to start editing</p>
                  <p className="text-sm text-muted-foreground">Maximum 1 file, up to 50MB • All processing happens in your browser</p>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-24 space-y-4">
            <Loader className="h-10 w-10 text-primary animate-spin" />
            <p className="text-lg font-medium">Generating page thumbnails...</p>
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-destructive mr-3" />
              <p className="text-destructive font-medium text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Main Studio Layout: Canvas + Sidebar */}
        {file && !loading && !downloadUrl && (
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Left: Page Canvas */}
            <div className="flex-1 bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6">
              {/* File info bar */}
              <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-fuchsia-500/10 p-2 rounded-md">
                    <FileText className="h-5 w-5 text-fuchsia-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{activePages.length} pages • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={removeFile} className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-full hover:bg-destructive/10">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-muted/20 border border-border rounded-xl max-h-[65vh] overflow-y-auto">
                {pages.map((page, index) => {
                  if (page.deleted) return null;
                  return (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropEvent(e, index)}
                      className="group relative flex flex-col items-center bg-background border border-border rounded-lg p-2 shadow-sm cursor-grab hover:shadow-md hover:border-primary/40 transition-all"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                        <button onClick={() => setPreviewPageIndex(index)} className="bg-card/90 backdrop-blur border border-border text-foreground p-1.5 rounded-md hover:bg-muted transition-colors" title="Preview">
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => rotatePage(index)} className="bg-card/90 backdrop-blur border border-border text-foreground p-1.5 rounded-md hover:bg-muted transition-colors" title="Rotate">
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deletePage(index)} className="bg-destructive/90 backdrop-blur border border-destructive text-destructive-foreground p-1.5 rounded-md hover:bg-destructive transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-card/90 backdrop-blur border border-border p-1 rounded-md pointer-events-none">
                        <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="w-full aspect-[1/1.4] flex items-center justify-center overflow-hidden bg-muted rounded-md mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.thumbnailUrl}
                          alt={`Page ${index + 1}`}
                          className="max-w-full max-h-full object-contain transition-transform duration-300"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Page {index + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Options Sidebar */}
            <div className="xl:w-80 flex flex-col gap-4">
              {/* Options Panel */}
              <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-base">Edit Options</h2>
                </div>

                {/* Page Numbers Toggle */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-semibold">Add Page Numbers</span>
                    </div>
                    <button
                      onClick={() => setOptions(o => ({ ...o, addPageNumbers: !o.addPageNumbers }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${options.addPageNumbers ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${options.addPageNumbers ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {options.addPageNumbers && (
                    <div className="space-y-2 pl-1">
                      <select
                        value={options.pageNumberPosition}
                        onChange={(e) => setOptions(o => ({ ...o, pageNumberPosition: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-right">Top Right</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Start at:</label>
                        <input
                          type="number"
                          min="1"
                          value={options.pageNumberStart}
                          onChange={(e) => setOptions(o => ({ ...o, pageNumberStart: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Watermark Toggle */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-semibold">Add Watermark</span>
                    </div>
                    <button
                      onClick={() => setOptions(o => ({ ...o, addWatermark: !o.addWatermark }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${options.addWatermark ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${options.addWatermark ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {options.addWatermark && (
                    <div className="pl-1">
                      <input
                        type="text"
                        value={options.watermarkText}
                        onChange={(e) => setOptions(o => ({ ...o, watermarkText: e.target.value }))}
                        placeholder="e.g. CONFIDENTIAL"
                        maxLength={40}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}
                </div>

                {/* Grayscale Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold">Convert to Grayscale</span>
                    </div>
                    <button
                      onClick={() => setOptions(o => ({ ...o, grayscale: !o.grayscale }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${options.grayscale ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${options.grayscale ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {options.grayscale && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md border border-border">
                      ⚠️ Converts pages to images to apply filter. Text will no longer be selectable and file size may increase.
                    </p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={processing || activePages.length === 0}
                className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {processing ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save & Download PDF</span>
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground px-2">
                🔒 Your file never leaves your device. All edits happen 100% in the browser.
              </p>
            </div>
          </div>
        )}

        {/* Success */}
        {downloadUrl && (
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">PDF Saved Successfully!</h3>
              <p className="text-muted-foreground mt-2 max-w-md">Your document was processed entirely in your browser. No data was uploaded to any server.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <a
                href={downloadUrl}
                download={`edited_${file?.name}`}
                className="bg-primary text-primary-foreground py-3.5 px-8 rounded-xl hover:opacity-90 transition-opacity font-semibold flex items-center justify-center shadow-sm"
              >
                Download PDF
              </a>
              <button
                onClick={removeFile}
                className="bg-card border border-border hover:bg-muted py-3.5 px-8 rounded-xl transition-colors font-medium"
              >
                Edit Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
