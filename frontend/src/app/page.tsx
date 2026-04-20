import { Sparkles, Zap, Lock } from 'lucide-react';
import Link from 'next/link';
import { RecentToolsList } from '@/components/RecentToolsList';
import { ToolsGrid } from '@/components/ToolsGrid';

export default function Home() {

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden py-24 lg:py-32 flex flex-col items-center justify-center text-center px-4">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        
        <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-medium mb-8 bg-background/50 backdrop-blur-sm">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          <span>Lightning fast client-side processing</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
          Every tool you need to work with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">PDFs</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-10">
          Make use of our collection of PDF tools to process digital documents and streamline your workflow seamlessly.
        </p>
        
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <span className="flex items-center"><Zap className="w-4 h-4 mr-1 text-yellow-500" /> Fast</span>
          <span>•</span>
          <span className="flex items-center"><Lock className="w-4 h-4 mr-1 text-green-500" /> Secure</span>
          <span>•</span>
          <span>Free Forever</span>
        </div>
      </section>

      <RecentToolsList />

      {/* Tools Grid with Search */}
      <ToolsGrid />
    </div>
  );
}
