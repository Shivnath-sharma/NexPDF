import { Sparkles, Zap, Lock } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/config/tools';
import { RecentToolsList } from '@/components/RecentToolsList';

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

      {/* Tools Grid */}
      <section className="w-full max-w-7xl px-4 pb-24">
        <div className="flex flex-wrap justify-center gap-6">
          {TOOLS.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Link
                key={tool.name}
                href={tool.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-6 border border-border transition-all duration-300 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[420px] hover:shadow-2xl hover:-translate-y-2 hover:border-primary/50 dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tool.color} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 -mr-10 -mt-10`}></div>
                
                <div>
                  <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} p-3 mb-5 text-white shadow-lg ${tool.shadow} transform group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                
                <div className="mt-6 flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  Try it now <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
