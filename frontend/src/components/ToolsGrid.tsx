'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { TOOLS } from '@/config/tools';

export function ToolsGrid() {
  const [query, setQuery] = useState('');

  const filteredTools = TOOLS.filter(tool => 
    tool.name.toLowerCase().includes(query.toLowerCase()) || 
    tool.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="w-full max-w-7xl px-4 pb-24 flex flex-col items-center">
      {/* Search Bar */}
      <div className="w-full max-w-2xl mb-12 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          className="w-full bg-card border-2 border-border rounded-2xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm hover:shadow-md"
          placeholder="Search for a tool (e.g. merge, compress, sign...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filteredTools.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-6 w-full">
          {filteredTools.map((tool) => {
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
      ) : (
        <div className="py-20 text-center w-full bg-card rounded-3xl border border-border">
          <p className="text-2xl font-semibold mb-2">No tools found</p>
          <p className="text-muted-foreground">We couldn&apos;t find anything matching &quot;{query}&quot;</p>
        </div>
      )}
    </section>
  );
}
