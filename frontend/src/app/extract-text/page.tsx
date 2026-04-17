'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, XCircle, Loader, ArrowLeft, Copy, Download, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ExtractText() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setExtractedText(null);
    setError(null);
    setLoading(true);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      setPageCount(totalPages);

      const allText: string[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Join all text items on the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText) {
          allText.push(`--- Page ${i} ---\n${pageText}`);
        } else {
          allText.push(`--- Page ${i} ---\n[No text found on this page]`);
        }
      }

      const fullText = allText.join('\n\n');
      setExtractedText(fullText);

      const hasText = allText.some(p => !p.includes('[No text found'));
      if (!hasText) {
        toast.warning('No text found — this PDF may be a scanned image.');
      } else {
        toast.success(`Text extracted from ${totalPages} page${totalPages > 1 ? 's' : ''}!`);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to extract text. The file might be corrupted or encrypted.');
      toast.error('Failed to extract text from PDF.');
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

  const handleCopy = async () => {
    if (!extractedText) return;
    await navigator.clipboard.writeText(extractedText);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace('.pdf', '') + '_extracted.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Text file downloaded!');
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText(null);
    setError(null);
    setPageCount(0);
  };

  const wordCount = extractedText
    ? extractedText.split(/\s+/).filter(w => w && !w.startsWith('---')).length
    : 0;

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">PDF → Text Extractor</h1>
        <p className="text-lg text-muted-foreground">
          Extract all readable text from your PDF — instantly, privately, in your browser.
        </p>
      </div>

      <main className="w-full max-w-4xl space-y-6">
        {/* Upload */}
        {!file && !loading && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-10">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
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
                  <p className="text-lg font-medium mb-2">Drag & drop a PDF to extract its text</p>
                  <p className="text-sm text-muted-foreground">Max 1 file, up to 50MB • Works best with text-based PDFs</p>
                </div>
              )}
            </div>

            {/* Scanned PDF Warning */}
            <div className="mt-5 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> This tool only works with PDFs that contain real selectable text (reports, invoices, Word exports). Scanned/photo PDFs will return empty pages.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-24 space-y-4">
            <Loader className="h-10 w-10 text-primary animate-spin" />
            <p className="text-lg font-medium">Extracting text from PDF...</p>
            <p className="text-sm text-muted-foreground">This happens entirely in your browser</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-destructive font-medium text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {extractedText && file && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-5">
            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{pageCount} page{pageCount > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5">
                  <span className="text-sm font-medium">~{wordCount.toLocaleString()} words</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 bg-muted hover:bg-muted/80 border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Download className="h-4 w-4" />
                  Download .txt
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 bg-card border border-border hover:bg-muted text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            {/* Text Area */}
            <div className="relative">
              <textarea
                readOnly
                value={extractedText}
                className="w-full h-[55vh] resize-none bg-muted/20 border border-border rounded-xl p-4 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
