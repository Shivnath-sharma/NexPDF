'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, FileLock2, CheckCircle, XCircle, Loader } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';
import { addHistoryItem } from '@/utils/history';

export default function FlattenPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleFlatten = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      if (fields.length === 0) {
        toast.info('No fillable fields found to flatten in this PDF.');
        // We can still "flatten" it by just returning the same PDF, or we can just give it back.
      } else {
        form.flatten();
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('PDF flattened successfully!');
      addHistoryItem('Flatten PDF', file.name);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to flatten the PDF.');
      toast.error('Failed to process the PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setDownloadUrl(null);
    setError(null);
  };

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
        <div className="mx-auto w-20 h-20 bg-slate-500/10 rounded-full flex items-center justify-center mb-6">
          <FileLock2 className="h-10 w-10 text-slate-500" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Flatten PDF</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Lock interactive form fields permanently so they can no longer be edited. 100% secure client-side processing.
        </p>
      </div>

      <main className="w-full max-w-3xl space-y-6">
        {/* Upload */}
        {!file && (
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              {isDragActive ? (
                <p className="text-xl font-medium text-primary">Drop your PDF here...</p>
              ) : (
                <div>
                  <p className="text-xl font-medium mb-2">Drag & drop a fillable PDF</p>
                  <p className="text-sm text-muted-foreground">Up to 50MB • All processing is done locally</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {/* File Selected & Ready to Process */}
        {file && !downloadUrl && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <FileLock2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">{file.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button onClick={reset} className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 bg-muted/5">
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-md mx-auto">
                Clicking the button below will convert all editable form fields into static text. This action is irreversible.
              </p>
              <button
                onClick={handleFlatten}
                disabled={processing}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {processing ? (
                  <><Loader className="h-5 w-5 animate-spin" /><span>Flattening...</span></>
                ) : (
                  <><FileLock2 className="h-5 w-5" /><span>Flatten Document</span></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {downloadUrl && (
          <div className="bg-card rounded-2xl border border-border p-10 flex flex-col items-center text-center gap-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
            <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-2">Flattened successfully!</h3>
              <p className="text-muted-foreground text-lg">Your PDF forms are now permanently locked.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-4">
              <a
                href={downloadUrl}
                download={`flattened_${file?.name}`}
                className="flex-1 bg-primary text-primary-foreground py-4 px-6 rounded-xl font-bold hover:opacity-90 transition-opacity text-center shadow-md flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-5 w-5 rotate-[270deg]" /> Download PDF
              </a>
              <button
                onClick={reset}
                className="flex-1 bg-muted border border-border py-4 px-6 rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Flatten Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
