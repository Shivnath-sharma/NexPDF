'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft, Upload, FileText, CheckCircle, XCircle,
  Loader, ClipboardList, ToggleLeft, Type, Hash, ChevronLeft, ChevronRight, Layout
} from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

interface FieldInfo {
  name: string;
  type: string;
  value: string | boolean;
  options?: string[];
}

export default function FormFiller() {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noFields, setNoFields] = useState(false);

  // Preview state
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setDownloadUrl(null);
    setNoFields(false);
    setFields([]);
    setValues({});
    setPagePreviews([]);
    setCurrentPage(0);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      // --- Render previews with pdfjs ---
      // IMPORTANT: pdfjs DETACHES the ArrayBuffer it receives.
      // We must pass a clone so the original stays intact for pdf-lib below.
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

      const pdf = await pdfjsLib.getDocument(arrayBuffer.slice(0)).promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);

      const previews: string[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          previews.push(canvas.toDataURL('image/jpeg', 0.9));
        }
      }
      setPagePreviews(previews);

      // --- Detect form fields with pdf-lib ---
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      const rawFields = form.getFields();

      if (rawFields.length === 0) {
        setNoFields(true);
        setLoading(false);
        return;
      }

      const detected: FieldInfo[] = rawFields.map(field => {
        const name = field.getName();
        const type = field.constructor.name;
        let value: string | boolean = '';
        let options: string[] | undefined;

        if (type === 'PDFTextField') {
          try { value = (field as any).getText() || ''; } catch { value = ''; }
        } else if (type === 'PDFCheckBox') {
          try { value = (field as any).isChecked(); } catch { value = false; }
        } else if (type === 'PDFDropdown' || type === 'PDFOptionList') {
          try {
            options = (field as any).getOptions() || [];
            const sel = (field as any).getSelected();
            value = sel?.length ? sel[0] : '';
          } catch { value = ''; }
        } else if (type === 'PDFRadioGroup') {
          try {
            options = (field as any).getOptions() || [];
            value = (field as any).getSelected() || '';
          } catch { value = ''; }
        }

        return { name, type, value, options };
      });

      setFields(detected);
      const initialValues: Record<string, string | boolean> = {};
      detected.forEach(f => { initialValues[f.name] = f.value; });
      setValues(initialValues);
    } catch (err: any) {
      console.error(err);
      setError('Could not read this PDF. It may be encrypted or corrupted.');
      toast.error('Failed to read PDF form fields.');
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

  const handleFill = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const form = pdfDoc.getForm();

      for (const field of fields) {
        const val = values[field.name];
        try {
          if (field.type === 'PDFTextField') {
            form.getTextField(field.name).setText(String(val ?? ''));
          } else if (field.type === 'PDFCheckBox') {
            val ? form.getCheckBox(field.name).check() : form.getCheckBox(field.name).uncheck();
          } else if (field.type === 'PDFDropdown') {
            if (val) form.getDropdown(field.name).select(String(val));
          } else if (field.type === 'PDFOptionList') {
            if (val) form.getOptionList(field.name).select(String(val));
          } else if (field.type === 'PDFRadioGroup') {
            if (val) form.getRadioGroup(field.name).select(String(val));
          }
        } catch (fieldErr) {
          console.warn(`Could not fill field "${field.name}":`, fieldErr);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      toast.success('Form filled successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fill the form.');
      toast.error('Failed to fill the PDF form.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFields([]);
    setValues({});
    setDownloadUrl(null);
    setError(null);
    setNoFields(false);
    setPagePreviews([]);
    setCurrentPage(0);
    setTotalPages(0);
  };

  const getFieldIcon = (type: string) => {
    if (type === 'PDFCheckBox') return <ToggleLeft className="h-4 w-4 text-emerald-500" />;
    if (type === 'PDFDropdown' || type === 'PDFOptionList') return <ClipboardList className="h-4 w-4 text-blue-500" />;
    if (type === 'PDFRadioGroup') return <Hash className="h-4 w-4 text-purple-500" />;
    return <Type className="h-4 w-4 text-orange-500" />;
  };

  const getFieldLabel = (type: string) => {
    if (type === 'PDFTextField') return 'Text';
    if (type === 'PDFCheckBox') return 'Checkbox';
    if (type === 'PDFDropdown') return 'Dropdown';
    if (type === 'PDFOptionList') return 'Option List';
    if (type === 'PDFRadioGroup') return 'Radio';
    return type.replace('PDF', '');
  };

  return (
    <div className="w-full flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-7xl flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border rounded-lg px-4 py-2 transition-all hover:-translate-x-1 shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
        </Link>
      </div>

      <div className="w-full max-w-7xl text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">PDF Form Filler</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload a PDF with fillable fields, fill them in, and download — 100% in your browser.
        </p>
      </div>

      <main className="w-full max-w-7xl space-y-6">
        {/* Upload */}
        {!file && !loading && (
          <div className="bg-card rounded-2xl border border-border p-8">
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
                  <p className="text-sm text-muted-foreground">Up to 50MB • All processing is done locally in your browser</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-24 gap-4">
            <Loader className="h-10 w-10 text-primary animate-spin" />
            <p className="font-medium text-lg">Reading PDF and detecting fields...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {/* No fields found */}
        {noFields && !loading && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Still show the preview even when no fields found */}
            {pagePreviews.length > 0 && (
              <div className="flex-1 bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <Layout className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Page Preview</span>
                  <span className="ml-auto text-xs text-muted-foreground">{currentPage + 1} / {totalPages}</span>
                </div>
                <div className="flex justify-center bg-muted/30 rounded-xl p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pagePreviews[currentPage]} alt={`Page ${currentPage + 1}`} className="max-w-full max-h-[60vh] object-contain rounded shadow-md" />
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium">Page {currentPage + 1} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="lg:w-96 bg-card rounded-2xl border border-border p-8 flex flex-col items-center text-center gap-4">
              <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold">No Fillable Fields Found</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                This PDF doesn't contain any interactive AcroForm fields. Try a PDF that was designed to be filled out.
              </p>
              <button onClick={reset} className="mt-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Try Another PDF
              </button>
            </div>
          </div>
        )}

        {/* Main Two-Column Layout */}
        {file && fields.length > 0 && !downloadUrl && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* LEFT: PDF Preview */}
            <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/20">
                <Layout className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Document Preview</span>
                {totalPages > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {totalPages} page{totalPages > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex justify-center items-center bg-muted/30 p-6 min-h-[500px]">
                {pagePreviews.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pagePreviews[currentPage]}
                    alt={`Page ${currentPage + 1}`}
                    className="max-w-full max-h-[70vh] object-contain rounded shadow-xl border border-border/50"
                  />
                ) : (
                  <Loader className="h-8 w-8 text-primary animate-spin" />
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 border-t border-border">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium">Page {currentPage + 1} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: Fields Panel */}
            <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-4">
              {/* File info */}
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{fields.length} fillable fields</p>
                  </div>
                </div>
                <button onClick={reset} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              {/* Fields */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Form Fields
                  </h2>
                </div>
                <div className="p-4 space-y-4 max-h-[55vh] overflow-y-auto">
                  {fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        {getFieldIcon(field.type)}
                        <span className="truncate">{field.name}</span>
                        <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">
                          {getFieldLabel(field.type)}
                        </span>
                      </label>

                      {field.type === 'PDFTextField' && (
                        <input
                          type="text"
                          value={String(values[field.name] ?? '')}
                          onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                          placeholder={`Enter ${field.name}...`}
                        />
                      )}

                      {field.type === 'PDFCheckBox' && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setValues(v => ({ ...v, [field.name]: !v[field.name] }))}
                            className={`relative w-10 h-5 rounded-full transition-colors ${values[field.name] ? 'bg-primary' : 'bg-muted border border-border'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${values[field.name] ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                          <span className="text-xs text-muted-foreground">{values[field.name] ? 'Checked' : 'Unchecked'}</span>
                        </div>
                      )}

                      {(field.type === 'PDFDropdown' || field.type === 'PDFOptionList' || field.type === 'PDFRadioGroup') && field.options && (
                        <select
                          value={String(values[field.name] ?? '')}
                          onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        >
                          <option value="">-- Select an option --</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="p-4 border-t border-border space-y-3">
                  <button
                    onClick={handleFill}
                    disabled={processing}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {processing ? (
                      <><Loader className="h-4 w-4 animate-spin" /><span>Filling...</span></>
                    ) : (
                      <><ClipboardList className="h-4 w-4" /><span>Fill & Download PDF</span></>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    🔒 Your data never leaves your device
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {downloadUrl && (
          <div className="bg-card rounded-2xl border border-border p-10 flex flex-col items-center text-center gap-5">
            <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-9 w-9 text-green-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-1">Form Filled!</h3>
              <p className="text-muted-foreground">Your completed PDF is ready to download.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <a
                href={downloadUrl}
                download={`filled_${file?.name}`}
                className="flex-1 bg-primary text-primary-foreground py-3.5 px-6 rounded-xl font-bold hover:opacity-90 transition-opacity text-center"
              >
                Download PDF
              </a>
              <button
                onClick={reset}
                className="flex-1 bg-muted border border-border py-3.5 px-6 rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Fill Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
