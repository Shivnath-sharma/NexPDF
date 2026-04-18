import { 
  FileText, Scissors, Archive, Image as ImageIcon,
  Droplet, Layers, FileSearch, Images, ShieldAlert, Info, RotateCw, CopyMinus
} from 'lucide-react';

export const TOOLS = [
  {
    name: 'Rotate PDF',
    description: 'Rotate individual pages or the entire PDF clockwise or counter-clockwise.',
    icon: RotateCw,
    href: '/rotate',
    color: 'from-orange-500 to-red-500',
    shadow: 'shadow-orange-500/20'
  },
  {
    name: 'Remove / Extract Pages',
    description: 'Delete unwanted pages or pull out specific pages into a new PDF.',
    icon: CopyMinus,
    href: '/select-pages',
    color: 'from-rose-500 to-red-600',
    shadow: 'shadow-rose-500/20'
  },
  {
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one single document instantly.',
    icon: FileText,
    href: '/merge',
    color: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/20'
  },
  {
    name: 'Split PDF',
    description: 'Extract pages from your PDF or save each page as a separate PDF.',
    icon: Scissors,
    href: '/split',
    color: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/20'
  },
  {
    name: 'PDF Editor Studio',
    description: 'Reorder, rotate & delete pages. Add watermarks & page numbers — all in one place.',
    icon: Layers,
    href: '/organize',
    color: 'from-fuchsia-500 to-pink-600',
    shadow: 'shadow-fuchsia-500/20'
  },
  {
    name: 'Redact PDF',
    description: 'Black out sensitive information from your PDF securely in your browser.',
    icon: ShieldAlert,
    href: '/redact',
    color: 'from-slate-700 to-slate-900',
    shadow: 'shadow-slate-500/20'
  },
  {
    name: 'Compress PDF',
    description: 'Reduce the file size of your PDF while maintaining optimal quality.',
    icon: Archive,
    href: '/compress',
    color: 'from-violet-500 to-purple-500',
    shadow: 'shadow-violet-500/20'
  },
  {
    name: 'Watermark PDF',
    description: 'Add a custom text stamp or watermark to your PDF document.',
    icon: Droplet,
    href: '/watermark',
    color: 'from-indigo-500 to-blue-600',
    shadow: 'shadow-indigo-500/20'
  },
  {
    name: 'JPG to PDF',
    description: 'Convert JPG, PNG, or GIF images to PDF in seconds.',
    icon: ImageIcon,
    href: '/jpg-to-pdf',
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-orange-500/20'
  },
  {
    name: 'PDF to Text',
    description: 'Extract all readable text from a PDF and download as a .txt file.',
    icon: FileSearch,
    href: '/extract-text',
    color: 'from-cyan-500 to-sky-600',
    shadow: 'shadow-cyan-500/20'
  },
  {
    name: 'PDF to Image',
    description: 'Convert PDF pages to JPG, PNG, or WebP — pick your format.',
    icon: Images,
    href: '/pdf-to-image',
    color: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/20'
  },
  {
    name: 'PDF Metadata',
    description: 'View hidden properties, author details, and creation dates of any PDF.',
    icon: Info,
    href: '/metadata',
    color: 'from-blue-600 to-indigo-800',
    shadow: 'shadow-blue-700/20'
  },
];
