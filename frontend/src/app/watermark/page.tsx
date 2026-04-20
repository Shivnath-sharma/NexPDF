'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, FileText, CheckCircle, XCircle, Loader, ArrowLeft, 
  Droplet, Type, Image as ImageIcon, Maximize2, Move, RotateCcw, 
  Layers, Sliders, Layout
} from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { toast } from 'sonner';

type WatermarkType = 'text' | 'image';
type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';

export default function WatermarkPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [opacity, setOpacity] = useState(0.3);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState<Position>('center');
  
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Preview logic
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
    setProgress(0);

    // Generate PDF preview for the first page
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPdfPageSize({ width: viewport.width, height: viewport.height });

      if (context) {
        await page.render({ canvasContext: context, viewport } as any).promise;
        setPdfPreview(canvas.toDataURL());
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Could not generate PDF preview');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPdfPreview(null);
    setDownloadUrl(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleWatermark = async () => {
    if (!file) return;
    if (watermarkType === 'image' && !imageFile) {
      toast.error('Please upload a watermark image');
      return;
    }

    setProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      let watermarkImage: any = null;
      if (watermarkType === 'image' && imageFile) {
        const imageBytes = await imageFile.arrayBuffer();
        watermarkImage = imageFile.type === 'image/png' 
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);
      }

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        
        if (watermarkType === 'text') {
          const fontSize = 50 * scale;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          
          let x = 0, y = 0;
          if (position === 'center') {
            x = width / 2;
            y = height / 2;
          } else if (position === 'top-left') {
            x = 50; y = height - 50;
          } else if (position === 'top-right') {
            x = width - 50; y = height - 50;
          } else if (position === 'bottom-left') {
            x = 50; y = 50;
          } else if (position === 'bottom-right') {
            x = width - 50; y = 50;
          }

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity,
            rotate: degrees(rotation),
            // Origin adjustment for center
            ...(position === 'center' && {
              x: x - (textWidth / 2),
              y: y - (textHeight / 4), // Roughly center text vertically
            })
          });
        } else if (watermarkType === 'image' && watermarkImage) {
          const imgDims = watermarkImage.scale(scale * 0.5); // Normalized scale
          let x = 0, y = 0;
          
          if (position === 'center') {
            x = width / 2 - imgDims.width / 2;
            y = height / 2 - imgDims.height / 2;
          } else if (position === 'top-left') {
            x = 20; y = height - imgDims.height - 20;
          } else if (position === 'top-right') {
            x = width - imgDims.width - 20; y = height - imgDims.height - 20;
          } else if (position === 'bottom-left') {
            x = 20; y = 20;
          } else if (position === 'bottom-right') {
            x = width - imgDims.width - 20; y = 20;
          }

          page.drawImage(watermarkImage, {
            x, y,
            width: imgDims.width,
            height: imgDims.height,
            opacity,
            rotate: degrees(rotation),
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('Watermark applied successfully!');
    } catch (err: any) {
      console.error(err);
      setError('Failed to apply watermark. Is the PDF protected?');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center py-12 px-4 bg-background">
      <div className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-card border border-border rounded-lg px-4 py-2 hover:bg-muted transition-all shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-6xl text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Advanced Watermark PDF
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Add professional text or image watermarks with precise positioning, rotation, and live preview.
        </p>
      </div>

      <main className="w-full max-w-6xl">
        {!file ? (
          <div className="bg-card rounded-3xl shadow-xl border border-border p-8 md:p-16">
            <div
              {...getRootProps()}
              className={`border-3 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
                isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <p className="text-2xl font-bold mb-4">Drag & drop your PDF</p>
              <p className="text-muted-foreground text-sm">or click to browse from your computer (Up to 50MB)</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Preview Panel */}
            <div className="flex-1 bg-card rounded-3xl shadow-xl border border-border p-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Layout className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">Live Preview</h2>
                </div>
                <button onClick={removeFile} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Change PDF
                </button>
              </div>

              <div className="relative bg-muted/50 rounded-xl border border-border p-4 w-full flex justify-center items-center min-h-[500px] overflow-hidden" ref={previewContainerRef}>
                {pdfPreview ? (
                  <div className="relative shadow-2xl rounded-sm overflow-hidden" style={{ width: 'fit-content' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pdfPreview} alt="PDF Page Preview" className="max-w-full max-h-[70vh] select-none" />
                    
                    {/* Watermark Overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
                      style={{ 
                        opacity,
                        justifyContent: position === 'center' ? 'center' : position.includes('left') ? 'flex-start' : 'flex-end',
                        alignItems: position === 'center' ? 'center' : position.includes('top') ? 'flex-start' : 'flex-end',
                        padding: position === 'center' ? '0' : '20px'
                      }}
                    >
                      <div 
                        style={{ 
                          transform: `rotate(${rotation}deg) scale(${scale})`,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {watermarkType === 'text' ? (
                          <span className="text-4xl font-black text-slate-500 whitespace-nowrap drop-shadow-sm">
                            {text || 'PREVIEW'}
                          </span>
                        ) : (
                          imagePreview && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imagePreview} alt="Watermark Preview" className="max-w-[200px] max-h-[200px] object-contain" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Loader className="h-10 w-10 animate-spin text-primary" />
                )}
              </div>
            </div>

            {/* Right: Controls Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-6">
              <div className="bg-card rounded-3xl shadow-xl border border-border p-6 space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <Sliders className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">Watermark Settings</h2>
                </div>

                {/* Type Switcher */}
                <div className="grid grid-cols-2 bg-muted p-1 rounded-xl">
                  <button
                    onClick={() => setWatermarkType('text')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      watermarkType === 'text' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Type className="h-4 w-4" /> Text
                  </button>
                  <button
                    onClick={() => setWatermarkType('image')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      watermarkType === 'image' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" /> Image
                  </button>
                </div>

                {/* Content Input */}
                <div className="space-y-4">
                  {watermarkType === 'text' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Type className="h-3 w-3" /> Watermark Text
                      </label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="Enter text..."
                        maxLength={50}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="h-3 w-3" /> Watermark Image
                      </label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-all bg-background">
                        <div className="flex flex-col items-center justify-center py-4">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground font-medium">
                            {imageFile ? imageFile.name : 'Select PNG/JPG logo'}
                          </p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    </div>
                  )}

                  {/* Slider Controls */}
                  <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Droplet className="h-3 w-3" /> Opacity
                        </label>
                        <span className="text-xs font-mono">{(opacity * 100).toFixed(0)}%</span>
                      </div>
                      <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Maximize2 className="h-3 w-3" /> Size Scale
                        </label>
                        <span className="text-xs font-mono">{scale.toFixed(1)}x</span>
                      </div>
                      <input type="range" min="0.1" max="3" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <RotateCcw className="h-3 w-3" /> Rotation
                        </label>
                        <span className="text-xs font-mono">{rotation}°</span>
                      </div>
                      <input type="range" min="-180" max="180" step="1" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                  </div>

                  {/* Position Picker */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Move className="h-3 w-3" /> Position
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded-xl border border-border">
                      {[
                        { id: 'top-left', label: '↖' },
                        { id: 'top-center', label: '↑' },
                        { id: 'top-right', label: '↗' },
                        { id: 'center-left', label: '←' },
                        { id: 'center', label: '•' },
                        { id: 'center-right', label: '→' },
                        { id: 'bottom-left', label: '↙' },
                        { id: 'bottom-center', label: '↓' },
                        { id: 'bottom-right', label: '↘' }
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => setPosition(pos.id as any)}
                          className={`h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                            position === pos.id ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Final Action */}
                {!downloadUrl ? (
                  <button
                    onClick={handleWatermark}
                    disabled={processing || (watermarkType === 'image' && !imageFile)}
                    className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                  >
                    {processing ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Droplet className="h-5 w-5" />
                        <span>Add Watermark</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <a
                      href={downloadUrl}
                      download={`watermarked_${file.name}`}
                      className="w-full bg-green-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
                    >
                      <CheckCircle className="h-6 w-6" />
                      Download PDF
                    </a>
                    <button onClick={removeFile} className="w-full text-sm font-medium text-muted-foreground hover:text-foreground py-2 transition-colors">
                      Watermark Another
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-3">
                <Layers className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-[11px] text-primary/80 font-medium leading-relaxed">
                  Tip: Use PNG images with transparent backgrounds for the best results. All processing is 100% client-side.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
