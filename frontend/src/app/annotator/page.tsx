'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Highlighter, PenLine, Type, Eraser, Download,
  Loader, Upload, ChevronLeft, ChevronRight, Trash2, Save, CheckCircle
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import { addHistoryItem } from '@/utils/history';

type Tool = 'pen' | 'highlight' | 'text' | 'eraser';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#ddd6fe', '#fed7aa'];

export default function PDFAnnotator() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Tool state
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ef4444');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(18);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');

  // Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annCanvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<any>(null);
  const annotationsRef = useRef<Map<number, string>>(new Map());
  const currentPageRef = useRef(1);
  const snapshotRef = useRef<ImageData | null>(null); // canvas snapshot before highlight drag

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Focus text input when it appears
  useEffect(() => {
    if (textPos && textInputRef.current) {
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [textPos]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const saveCurrentAnnotation = useCallback(() => {
    const canvas = annCanvasRef.current;
    if (!canvas) return;
    annotationsRef.current.set(currentPageRef.current, canvas.toDataURL('image/png'));
  }, []);

  const restoreAnnotation = useCallback((page: number) => {
    const canvas = annCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const saved = annotationsRef.current.get(page);
    if (saved) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = saved;
    }
  }, []);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current) return;
    const page = await pdfDocRef.current.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.8 });

    const pdfCanvas = pdfCanvasRef.current;
    const annCanvas = annCanvasRef.current;
    if (!pdfCanvas || !annCanvas) return;

    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    annCanvas.width = viewport.width;
    annCanvas.height = viewport.height;

    const ctx = pdfCanvas.getContext('2d');
    if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;

    restoreAnnotation(pageNum);
  }, [restoreAnnotation]);

  useEffect(() => {
    if (pdfDocRef.current) renderPage(currentPage);
  }, [currentPage, renderPage]);

  const goToPage = useCallback((newPage: number) => {
    saveCurrentAnnotation();
    setCurrentPage(newPage);
  }, [saveCurrentAnnotation]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (!selected) return;
    setFile(selected);
    setLoading(true);
    setDownloadUrl(null);
    annotationsRef.current.clear();

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
      const arrayBuffer = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setTimeout(() => renderPage(1), 80);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load PDF.');
    } finally {
      setLoading(false);
    }
  }, [renderPage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  // ─── Drawing Handlers ───────────────────────────────────────────────────────

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (tool === 'text') {
      setTextPos(pos);
      setTextInput('');
      return;
    }
    setIsDrawing(true);
    setStartPos(pos);
    const ctx = annCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'highlight') {
      // Snapshot the canvas before we start dragging so we can restore on each mousemove
      snapshotRef.current = ctx.getImageData(0, 0, annCanvasRef.current!.width, annCanvasRef.current!.height);
    } else if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = annCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (tool === 'highlight' && snapshotRef.current) {
      // Restore snapshot so previous drag ghost is removed, then draw live preview
      ctx.putImageData(snapshotRef.current, 0, 0);
      const x = Math.min(startPos.x, pos.x);
      const y = Math.min(startPos.y, pos.y);
      const w = Math.abs(pos.x - startPos.x);
      const h = Math.abs(pos.y - startPos.y);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = highlightColor;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x, y, w, h);
      // Draw a dashed border for visual clarity
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  };

  const endDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getPos(e);
    const ctx = annCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'highlight' && snapshotRef.current) {
      // Restore clean snapshot and commit the final solid highlight
      ctx.putImageData(snapshotRef.current, 0, 0);
      snapshotRef.current = null;
      const x = Math.min(startPos.x, pos.x);
      const y = Math.min(startPos.y, pos.y);
      const w = Math.abs(pos.x - startPos.x);
      const h = Math.abs(pos.y - startPos.y);
      if (w > 2 && h > 2) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = highlightColor;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }
    } else if (tool === 'pen' || tool === 'eraser') {
      ctx.closePath();
    }
  };

  const placeText = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); return; }
    const ctx = annCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextPos(null);
    setTextInput('');
  };

  const clearPage = () => {
    const canvas = annCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    annotationsRef.current.delete(currentPage);
    toast.info('Page annotations cleared.');
  };

  // ─── Save to PDF ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!file) return;
    saveCurrentAnnotation();
    setSaving(true);

    try {
      const originalBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const pageNum = i + 1;
        const dataUrl = annotationsRef.current.get(pageNum);
        if (!dataUrl) continue;

        // Check if annotation canvas has any painted pixels
        const img = new Image();
        await new Promise<void>((res) => { img.onload = () => res(); img.src = dataUrl; });
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = img.width;
        tmpCanvas.height = img.height;
        const tmpCtx = tmpCanvas.getContext('2d')!;
        tmpCtx.drawImage(img, 0, 0);
        const px = tmpCtx.getImageData(0, 0, img.width, img.height).data;
        const hasContent = Array.from(px).some((v, idx) => idx % 4 === 3 && v > 0);
        if (!hasContent) continue;

        const pngBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngBytes);
        const page = pages[i];
        const { width, height } = page.getSize();
        page.drawImage(pngImage, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      addHistoryItem('PDF Annotator', file.name);
      toast.success('Annotations saved to PDF!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save PDF.');
    } finally {
      setSaving(false);
    }
  };

  const activeColor = tool === 'highlight' ? highlightColor : color;

  return (
    <div className="w-full flex flex-col items-center py-8 px-4 min-h-screen">
      {/* Header */}
      <div className="w-full max-w-7xl flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">PDF Annotator</h1>
          {file && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{file.name}</p>}
        </div>
        <div className="w-32" />
      </div>

      {/* Upload */}
      {!file && !loading && (
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mb-4">
              <Highlighter className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-muted-foreground">Upload a PDF to start annotating — draw, highlight, and add text directly on your document.</p>
          </div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? 'border-amber-500 bg-amber-500/5 scale-[1.01]' : 'border-border bg-card hover:border-amber-500/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-full ${isDragActive ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Upload className={`h-8 w-8 ${isDragActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <p className="font-bold">{isDragActive ? 'Drop your PDF!' : 'Drop a PDF or click to upload'}</p>
              <p className="text-sm text-muted-foreground">All processing is 100% local — private by design.</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4 mt-20">
          <Loader className="h-10 w-10 text-amber-500 animate-spin" />
          <p className="font-semibold">Loading PDF...</p>
        </div>
      )}

      {/* Editor */}
      {file && !loading && (
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-5">

          {/* ─── Left Toolbar ───────────────────────────────────────── */}
          <div className="lg:w-64 shrink-0 space-y-4">

            {/* Tools */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Tools</p>
              {([
                { id: 'pen',       label: 'Pen',       icon: PenLine,     desc: 'Freehand draw' },
                { id: 'highlight', label: 'Highlight', icon: Highlighter, desc: 'Drag to highlight' },
                { id: 'text',      label: 'Text',      icon: Type,        desc: 'Click to type' },
                { id: 'eraser',    label: 'Eraser',    icon: Eraser,      desc: 'Erase annotations' },
              ] as const).map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setTool(id as Tool)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    tool === id
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className={`text-[10px] ${tool === id ? 'text-white/70' : 'text-muted-foreground'}`}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Color pickers */}
            {tool !== 'eraser' && (
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {tool === 'highlight' ? 'Highlight Color' : 'Ink Color'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(tool === 'highlight' ? HIGHLIGHT_COLORS : COLORS).map((c) => (
                    <button
                      key={c}
                      onClick={() => tool === 'highlight' ? setHighlightColor(c) : setColor(c)}
                      className={`h-8 w-full rounded-lg border-2 transition-transform hover:scale-110 ${
                        activeColor === c ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size / Font settings */}
            {(tool === 'pen' || tool === 'eraser' || tool === 'text') && (
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                {(tool === 'pen' || tool === 'eraser') && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {tool === 'eraser' ? 'Eraser Size' : 'Stroke Width'}: {strokeWidth}px
                    </p>
                    <input
                      type="range" min="1" max="20"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                )}
                {tool === 'text' && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Font Size: {fontSize}px</p>
                    <input
                      type="range" min="10" max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Page actions */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Page Actions</p>
              <button
                onClick={clearPage}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Clear This Page
              </button>
            </div>

            {/* Save / Download */}
            <div className="space-y-2">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  download={`annotated_${file.name}`}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition-colors shadow-md shadow-green-500/20"
                >
                  <CheckCircle className="h-5 w-5" /> Download Annotated PDF
                </a>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {saving ? <Loader className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {saving ? 'Saving...' : 'Save Annotations'}
                </button>
              )}
            </div>
          </div>

          {/* ─── Canvas Area ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Canvas wrapper */}
            <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden flex items-center justify-center p-4 relative">
              <div className="relative shadow-2xl" style={{ maxWidth: '100%' }}>
                {/* PDF canvas (background) */}
                <canvas
                  ref={pdfCanvasRef}
                  className="block rounded-lg"
                  style={{ maxWidth: '100%', display: 'block' }}
                />
                {/* Annotation canvas (overlay) */}
                <canvas
                  ref={annCanvasRef}
                  className="absolute top-0 left-0 rounded-lg"
                  style={{
                    maxWidth: '100%',
                    width: pdfCanvasRef.current?.style.width || '100%',
                    height: pdfCanvasRef.current?.style.height || '100%',
                    cursor: tool === 'pen' ? 'crosshair'
                      : tool === 'eraser' ? 'cell'
                      : tool === 'text' ? 'text'
                      : 'crosshair',
                  }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                />

                {/* Text input overlay */}
                {textPos && (
                  <div
                    className="absolute z-10"
                    style={{
                      left: `${(textPos.x / (annCanvasRef.current?.width || 1)) * 100}%`,
                      top: `${(textPos.y / (annCanvasRef.current?.height || 1)) * 100}%`,
                      transform: 'translate(0, -100%)',
                    }}
                  >
                    <input
                      ref={textInputRef}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') placeText();
                        if (e.key === 'Escape') setTextPos(null);
                      }}
                      onBlur={placeText}
                      className="bg-white/90 border-2 border-amber-500 rounded px-2 py-1 text-sm font-bold shadow-lg outline-none min-w-[120px]"
                      style={{ color, fontSize: `${Math.max(12, fontSize / 2)}px` }}
                      placeholder="Type then Enter..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-4 bg-card border border-border rounded-xl px-5 py-3 shadow-sm">
              <button
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-semibold">
                Page <span className="text-amber-500">{currentPage}</span> of {numPages}
              </span>
              <button
                onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {tool === 'text'
                ? '💬 Click on the page to place a text label, then press Enter to confirm'
                : tool === 'highlight'
                ? '🖍️ Click and drag to highlight an area'
                : tool === 'eraser'
                ? '🧹 Click and drag to erase annotations'
                : '✏️ Click and drag to draw freehand'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
