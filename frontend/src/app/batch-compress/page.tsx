'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, PackageOpen, Upload, FileText, X, Loader, CheckCircle, AlertCircle, Download, Zap, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { addHistoryItem } from '@/utils/history';

type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface BatchFile {
  id: string;
  file: File;
  status: FileStatus;
  originalSize: number;
  compressedSize?: number;
  compressedBytes?: Uint8Array;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function savings(original: number, compressed: number): string {
  const pct = ((original - compressed) / original) * 100;
  return pct > 0 ? `-${pct.toFixed(1)}%` : `+${Math.abs(pct).toFixed(1)}%`;
}

export default function BatchCompress() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BatchFile[] = acceptedFiles.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: 'pending',
      originalSize: f.size,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setDone(false);
    setZipUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const compressOne = async (bf: BatchFile): Promise<BatchFile> => {
    try {
      const arrayBuffer = await bf.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Strip metadata & unused objects, then re-save with compression
      srcDoc.setTitle('');
      srcDoc.setAuthor('');
      srcDoc.setSubject('');
      srcDoc.setKeywords([]);
      srcDoc.setProducer('');
      srcDoc.setCreator('');

      const compressedBytes = await srcDoc.save({ useObjectStreams: true, addDefaultPage: false });

      return {
        ...bf,
        status: 'done',
        compressedSize: compressedBytes.length,
        compressedBytes,
      };
    } catch (err: any) {
      return { ...bf, status: 'error', error: err.message || 'Failed' };
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setDone(false);
    setZipUrl(null);

    // Process concurrently (up to 3 at a time)
    const CONCURRENCY = 3;
    const updated = [...files];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'processing' };
      setFiles([...updated]);
    }

    const results: BatchFile[] = [];
    for (let i = 0; i < updated.length; i += CONCURRENCY) {
      const chunk = updated.slice(i, i + CONCURRENCY);
      const settled = await Promise.all(chunk.map(compressOne));
      settled.forEach((res, idx) => {
        updated[i + idx] = res;
      });
      results.push(...settled);
      setFiles([...updated]);
    }

    // Build ZIP
    const zip = new JSZip();
    const folder = zip.folder('compressed_pdfs')!;
    let successCount = 0;

    results.forEach(r => {
      if (r.status === 'done' && r.compressedBytes) {
        const name = r.file.name.replace('.pdf', '_compressed.pdf');
        folder.file(name, r.compressedBytes);
        successCount++;
      }
    });

    if (successCount > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      setZipUrl(URL.createObjectURL(zipBlob));
      addHistoryItem('Batch Compress', `${successCount} PDF${successCount !== 1 ? 's' : ''}`);
      toast.success(`Compressed ${successCount} file${successCount !== 1 ? 's' : ''} successfully!`);
    } else {
      toast.error('All files failed to compress.');
    }

    setProcessing(false);
    setDone(true);
  };

  const reset = () => {
    setFiles([]);
    setDone(false);
    setZipUrl(null);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const totalOriginal = files.reduce((s, f) => s + f.originalSize, 0);
  const totalCompressed = files.filter(f => f.compressedSize).reduce((s, f) => s + (f.compressedSize ?? 0), 0);

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
        <div className="mx-auto w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mb-6">
          <PackageOpen className="h-10 w-10 text-violet-500" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Batch Compress</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload multiple PDFs, compress them all at once, and download everything as a single ZIP — 100% in your browser.
        </p>
      </div>

      <main className="w-full max-w-4xl space-y-5">

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-violet-500 bg-violet-500/5 scale-[1.01]'
              : 'border-border bg-card hover:border-violet-500/50 hover:bg-violet-500/5'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className={`p-4 rounded-full transition-colors ${isDragActive ? 'bg-violet-500/20' : 'bg-muted'}`}>
              <Upload className={`h-8 w-8 transition-colors ${isDragActive ? 'text-violet-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-base font-bold mb-1">
                {isDragActive ? 'Drop your PDFs here!' : 'Drop PDFs here or click to upload'}
              </p>
              <p className="text-sm text-muted-foreground">Select multiple files at once — all processed locally</p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

            {/* Header */}
            <div className="px-5 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{files.length} file{files.length !== 1 ? 's' : ''} queued</span>
              </div>
              {!processing && (
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Clear all
                </button>
              )}
            </div>

            {/* File rows */}
            <div className="divide-y divide-border">
              {files.map((bf) => (
                <div key={bf.id} className="flex items-center gap-3 px-5 py-3.5">
                  {/* Status Icon */}
                  <div className="shrink-0">
                    {bf.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                    {bf.status === 'processing' && <Loader className="h-5 w-5 text-violet-500 animate-spin" />}
                    {bf.status === 'done' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {bf.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                  </div>

                  {/* File name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={bf.file.name}>{bf.file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bf.status === 'pending' && formatBytes(bf.originalSize)}
                      {bf.status === 'processing' && 'Compressing...'}
                      {bf.status === 'done' && bf.compressedSize !== undefined && (
                        <span>
                          {formatBytes(bf.originalSize)} → <span className="font-semibold text-foreground">{formatBytes(bf.compressedSize)}</span>
                          <span className={`ml-1.5 font-bold ${bf.compressedSize < bf.originalSize ? 'text-green-500' : 'text-orange-400'}`}>
                            ({savings(bf.originalSize, bf.compressedSize)})
                          </span>
                        </span>
                      )}
                      {bf.status === 'error' && <span className="text-destructive">{bf.error}</span>}
                    </p>
                  </div>

                  {/* Remove button (only when not processing) */}
                  {!processing && bf.status !== 'processing' && (
                    <button
                      onClick={() => removeFile(bf.id)}
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Stats bar (after processing) */}
            {done && doneCount > 0 && (
              <div className="px-5 py-4 bg-muted/20 border-t border-border flex flex-wrap items-center gap-4 text-sm">
                <span className="text-green-500 font-semibold">✓ {doneCount} compressed</span>
                {errorCount > 0 && <span className="text-destructive font-semibold">✗ {errorCount} failed</span>}
                <span className="text-muted-foreground ml-auto">
                  Total: {formatBytes(totalOriginal)} → <span className="font-bold text-foreground">{formatBytes(totalCompressed)}</span>
                  <span className={`ml-1.5 font-bold ${totalCompressed < totalOriginal ? 'text-green-500' : 'text-orange-400'}`}>
                    ({savings(totalOriginal, totalCompressed)})
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleProcess}
              disabled={processing || files.length === 0}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20"
            >
              {processing ? (
                <><Loader className="h-5 w-5 animate-spin" /> Processing {files.length} files...</>
              ) : (
                <><Zap className="h-5 w-5" /> Compress All PDFs</>
              )}
            </button>

            {zipUrl && (
              <a
                href={zipUrl}
                download="compressed_pdfs.zip"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all shadow-md shadow-green-500/20"
              >
                <Download className="h-5 w-5" /> Download ZIP
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
