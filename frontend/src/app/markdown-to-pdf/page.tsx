'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCode, CheckCircle, Loader, Download } from 'lucide-react';
import { toast } from 'sonner';
import { marked } from 'marked';
import { addHistoryItem } from '@/utils/history';

export default function MarkdownToPDF() {
  const [markdown, setMarkdown] = useState<string>('# Hello Markdown\n\nWrite your **markdown** here to generate a beautiful PDF!\n\n## Features\n- Lists\n- **Bold text**\n- *Italics*\n- [Links](https://example.com)\n\n> Blockquotes work too!\n');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const parsed = marked.parse(markdown);
      setHtmlContent(parsed as string);
    } catch (e) {
      console.error(e);
    }
  }, [markdown]);

  const handleGenerate = async () => {
    if (!printRef.current) return;
    setProcessing(true);
    
    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default as any;
      
      const opt = {
        margin: 15, // top, left, bottom, right
        filename: 'markdown_document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Create a blob URL instead of downloading directly so we can show success UI
      const pdfWorker = html2pdf().set(opt).from(printRef.current);
      const pdfBlob = await pdfWorker.outputPdf('blob');
      
      const url = URL.createObjectURL(pdfBlob);
      setDownloadUrl(url);
      toast.success('PDF generated successfully!');
      addHistoryItem('Markdown to PDF', 'markdown_document.pdf');
      
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setDownloadUrl(null);
  };

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-6xl text-center mb-10">
        <div className="mx-auto w-20 h-20 bg-zinc-500/10 rounded-full flex items-center justify-center mb-6">
          <FileCode className="h-10 w-10 text-zinc-500" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Markdown to PDF</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convert your Markdown text into a beautifully styled PDF document instantly.
        </p>
      </div>

      <main className="w-full max-w-6xl">
        {!downloadUrl ? (
          <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
            {/* Editor */}
            <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" /> Markdown Input
                </span>
              </div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono leading-relaxed"
                placeholder="Type your markdown here..."
              />
            </div>

            {/* Preview & Action */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-primary" /> Live Preview
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-white text-black">
                  {/* Print Wrapper */}
                  <div 
                    ref={printRef}
                    className="prose prose-sm max-w-none font-sans"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      color: '#000',
                      lineHeight: '1.6',
                    }}
                  />
                  {/* Inline styles for the generated PDF to look decent without Tailwind Typography */}
                  <style jsx global>{`
                    .prose h1, .prose h2, .prose h3 { font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; }
                    .prose h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
                    .prose h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
                    .prose h3 { font-size: 1.25em; }
                    .prose p { margin-bottom: 1em; }
                    .prose a { color: #0366d6; text-decoration: none; }
                    .prose ul, .prose ol { padding-left: 2em; margin-bottom: 1em; }
                    .prose ul { list-style-type: disc; }
                    .prose blockquote { border-left: 4px solid #dfe2e5; padding-left: 1em; color: #6a737d; margin-left: 0; margin-bottom: 1em; }
                    .prose code { background-color: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 85%; }
                    .prose pre { background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 3px; margin-bottom: 1em; }
                    .prose pre code { background-color: transparent; padding: 0; }
                  `}</style>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={processing || !markdown.trim()}
                className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {processing ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Generate & Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-10 flex flex-col items-center text-center gap-5 shadow-lg max-w-2xl mx-auto">
            <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-2">PDF Generated Successfully!</h3>
              <p className="text-muted-foreground text-lg">Your markdown has been beautifully rendered.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
              <a
                href={downloadUrl}
                download="markdown_document.pdf"
                className="flex-1 bg-primary text-primary-foreground py-4 px-6 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center shadow-md"
              >
                Download PDF
              </a>
              <button
                onClick={reset}
                className="flex-1 bg-muted border border-border py-4 px-6 rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
