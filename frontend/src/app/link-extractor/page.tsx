'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link2, FileText, Loader, Copy, Check, ExternalLink, AlertCircle, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { addHistoryItem } from '@/utils/history';

interface ExtractedLink {
  url: string;
  page: number;
}

export default function LinkExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [links, setLinks] = useState<ExtractedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (!selected) return;
    setFile(selected);
    setLinks([]);
    setDone(false);
    setLoading(true);

    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const arrayBuffer = await selected.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extracted: ExtractedLink[] = [];
      const seen = new Set<string>();

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const annotations = await page.getAnnotations();

        for (const ann of annotations) {
          if (ann.subtype === 'Link' && ann.url) {
            const url = ann.url.trim();
            if (url && !seen.has(url)) {
              seen.add(url);
              extracted.push({ url, page: pageNum });
            }
          }
        }
      }

      setLinks(extracted);
      setDone(true);
      addHistoryItem('PDF Link Extractor', selected.name);

      if (extracted.length === 0) {
        toast.info('No hyperlinks found in this PDF.');
      } else {
        toast.success(`Found ${extracted.length} unique link${extracted.length !== 1 ? 's' : ''}!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to extract links. Is this a valid PDF?');
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const copyLink = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    const text = links.map(l => l.url).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success('All links copied to clipboard!');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const downloadTxt = () => {
    const content = links.map(l => `[Page ${l.page}] ${l.url}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `links_${file?.name.replace('.pdf', '')}.txt`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setLinks([]);
    setDone(false);
  };

  // Group links by page
  const byPage = links.reduce<Record<number, ExtractedLink[]>>((acc, link) => {
    if (!acc[link.page]) acc[link.page] = [];
    acc[link.page].push(link);
    return acc;
  }, {});

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-4xl text-center mb-10">
        <div className="mx-auto w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6">
          <Link2 className="h-10 w-10 text-cyan-500" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">PDF Link Extractor</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload any PDF and instantly extract every embedded hyperlink — grouped by page, ready to copy or download.
        </p>
      </div>

      <main className="w-full max-w-4xl space-y-6">
        {/* Drop zone */}
        {!done && !loading && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-cyan-500 bg-cyan-500/5 scale-[1.01]'
                : 'border-border bg-card hover:border-cyan-500/50 hover:bg-cyan-500/5'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full transition-colors ${isDragActive ? 'bg-cyan-500/20' : 'bg-muted'}`}>
                <Link2 className={`h-10 w-10 transition-colors ${isDragActive ? 'text-cyan-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-lg font-bold mb-1">
                  {isDragActive ? 'Drop your PDF here!' : 'Drop a PDF or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground">All processing is done locally — your file never leaves your device.</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-card border border-border rounded-2xl p-14 flex flex-col items-center gap-4 text-center shadow-sm">
            <Loader className="h-10 w-10 text-cyan-500 animate-spin" />
            <div>
              <p className="font-bold text-lg">Scanning PDF for links...</p>
              <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {done && (
          <>
            {/* File info + actions bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/10 p-2.5 rounded-xl">
                  <FileText className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm line-clamp-1">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {links.length > 0
                      ? `${links.length} unique link${links.length !== 1 ? 's' : ''} found across ${Object.keys(byPage).length} page${Object.keys(byPage).length !== 1 ? 's' : ''}`
                      : 'No links found'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {links.length > 0 && (
                  <>
                    <button
                      onClick={copyAll}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold bg-muted hover:bg-muted/80 border border-border px-4 py-2 rounded-lg transition-colors"
                    >
                      {copiedAll ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {copiedAll ? 'Copied!' : 'Copy All'}
                    </button>
                    <button
                      onClick={downloadTxt}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-600 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Export .txt
                    </button>
                  </>
                )}
                <button
                  onClick={reset}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border bg-background px-4 py-2 rounded-lg transition-colors"
                >
                  New File
                </button>
              </div>
            </div>

            {links.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-14 flex flex-col items-center gap-4 text-center shadow-sm">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">No links found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This PDF doesn't contain any embedded hyperlink annotations. Links that are just plain text (not clickable) cannot be detected.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(byPage).map(([page, pageLinks]) => (
                  <div key={page} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Page {page}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{pageLinks.length} link{pageLinks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {pageLinks.map((link, i) => {
                        const globalIndex = links.indexOf(link);
                        return (
                          <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-cyan-500 truncate" title={link.url}>
                                {link.url}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Open link"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                              <button
                                onClick={() => copyLink(link.url, globalIndex)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy link"
                              >
                                {copiedIndex === globalIndex
                                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                                  : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
