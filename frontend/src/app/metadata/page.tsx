'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Loader, ArrowLeft, Info, Calendar, User, Tag, Hash, HardDrive, Settings } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

interface PDFMetadata {
  title: string | undefined;
  author: string | undefined;
  subject: string | undefined;
  creator: string | undefined;
  producer: string | undefined;
  creationDate: Date | undefined;
  modificationDate: Date | undefined;
  pageCount: number;
  fileSize: number; // in bytes
}

export default function PDFMetadataViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setMetadata(null);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
      
      setMetadata({
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate(),
        pageCount: pdfDoc.getPageCount(),
        fileSize: selectedFile.size,
      });
      
      toast.success('Metadata extracted successfully');
    } catch (err) {
      console.error(err);
      setError('Error loading PDF or extracting metadata. Ensure the file is a valid PDF and not password protected.');
      toast.error('Failed to extract metadata');
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
    setMetadata(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not set';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const DataRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number | undefined }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
      <div className="bg-primary/10 p-2.5 rounded-lg text-primary mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-foreground font-medium mt-1 text-base">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 flex items-center justify-center">
          <Info className="mr-3 h-10 w-10 text-primary" />
          PDF Metadata Viewer
        </h1>
        <p className="text-lg text-muted-foreground">
          Instantly view hidden properties, author details, and creation dates of any PDF.
        </p>
      </div>

      <main className="w-full max-w-4xl">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10">
          
          {!file && !loading && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="text-xl font-medium mb-3">Upload PDF to View Metadata</p>
                <p className="text-sm text-muted-foreground">Your file stays in your browser. Nothing is uploaded to our servers.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <div className="relative">
                <Loader className="h-12 w-12 text-primary animate-spin" />
                <Info className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-medium text-foreground">Reading document properties...</p>
            </div>
          )}

          {error && (
            <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <p className="text-destructive font-medium">{error}</p>
              <button onClick={removeFile} className="mt-4 px-4 py-2 bg-background border border-border rounded-md text-sm hover:bg-muted transition-colors">
                Try another file
              </button>
            </div>
          )}

          {metadata && !loading && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">Metadata extracted successfully</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg transition-all font-semibold text-sm text-foreground border border-border shadow-sm"
                >
                  Start New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <DataRow icon={Tag} label="Title" value={metadata.title} />
                  <DataRow icon={User} label="Author" value={metadata.author} />
                  <DataRow icon={FileText} label="Subject" value={metadata.subject} />
                </div>
                <div className="space-y-1">
                  <DataRow icon={Settings} label="Creator Tool" value={metadata.creator} />
                  <DataRow icon={Settings} label="PDF Producer" value={metadata.producer} />
                </div>
                
                <div className="md:col-span-2 my-2 border-t border-border/50"></div>
                
                <div className="space-y-1">
                  <DataRow icon={Calendar} label="Creation Date" value={formatDate(metadata.creationDate)} />
                  <DataRow icon={Hash} label="Page Count" value={metadata.pageCount} />
                </div>
                <div className="space-y-1">
                  <DataRow icon={Calendar} label="Modification Date" value={formatDate(metadata.modificationDate)} />
                  <DataRow icon={HardDrive} label="File Size" value={formatFileSize(metadata.fileSize)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
