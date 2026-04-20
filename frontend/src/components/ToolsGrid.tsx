'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Star } from 'lucide-react';
import { TOOLS } from '@/config/tools';

// Extracted ToolCard to reuse for both Favourites and All Tools grids
function ToolCard({ tool, isFavourite, toggleFavourite }: { tool: any, isFavourite: boolean, toggleFavourite: (href: string, e: React.MouseEvent) => void }) {
  const IconComponent = tool.icon;
  
  return (
    <Link
      href={tool.href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-6 border border-border transition-all duration-300 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[420px] hover:shadow-2xl hover:-translate-y-2 hover:border-primary/50 dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tool.color} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 -mr-10 -mt-10`}></div>
      
      {/* Favourite Button */}
      <button
        onClick={(e) => toggleFavourite(tool.href, e)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors group/star"
        title={isFavourite ? "Remove from Favourites" : "Add to Favourites"}
      >
        <Star 
          className={`h-5 w-5 transition-all duration-300 ${isFavourite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground group-hover/star:text-yellow-400'}`} 
        />
      </button>

      <div>
        <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} p-3 mb-5 text-white shadow-lg ${tool.shadow} transform group-hover:scale-110 transition-transform duration-300`}>
          <IconComponent size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors pr-8">
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
}

export function ToolsGrid() {
  const [query, setQuery] = useState('');
  const [favourites, setFavourites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('nexpdf_favourites');
      if (stored) setFavourites(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load favourites', e);
    }
  }, []);

  const toggleFavourite = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setFavourites(prev => {
      let updated;
      if (prev.includes(href)) {
        updated = prev.filter(h => h !== href);
      } else {
        updated = [...prev, href];
      }
      try {
        localStorage.setItem('nexpdf_favourites', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  const filteredTools = TOOLS.filter(tool => 
    tool.name.toLowerCase().includes(query.toLowerCase()) || 
    tool.description.toLowerCase().includes(query.toLowerCase())
  );

  const favouriteTools = TOOLS.filter(tool => favourites.includes(tool.href));

  // If not mounted yet to avoid hydration mismatch, just render the main grid without favourites
  if (!mounted) {
    return (
      <section className="w-full max-w-7xl px-4 pb-24 flex flex-col items-center">
        <div className="w-full max-w-2xl mb-12 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="w-full bg-card border-2 border-border rounded-2xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            placeholder="Search for a tool (e.g. merge, compress, sign...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-6 w-full">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.href} tool={tool} isFavourite={false} toggleFavourite={() => {}} />
          ))}
        </div>
      </section>
    );
  }

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

      {/* Favourites Grid (Only show if not searching and has favourites) */}
      {!query && favouriteTools.length > 0 && (
        <div className="w-full mb-16">
          <div className="flex items-center gap-2 mb-6 ml-2">
            <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
            <h2 className="text-2xl font-bold">My Favourites</h2>
          </div>
          <div className="flex flex-wrap justify-start gap-6 w-full">
            {favouriteTools.map((tool) => (
              <ToolCard 
                key={`fav-${tool.href}`} 
                tool={tool} 
                isFavourite={true} 
                toggleFavourite={toggleFavourite} 
              />
            ))}
          </div>
        </div>
      )}

      {/* All Tools Section Header (Only if not searching and has favourites) */}
      {!query && favouriteTools.length > 0 && (
        <div className="w-full flex items-center mb-6 ml-2">
          <h2 className="text-2xl font-bold">All Tools</h2>
        </div>
      )}

      {/* Main Grid */}
      {filteredTools.length > 0 ? (
        <div className="flex flex-wrap justify-center sm:justify-start gap-6 w-full">
          {filteredTools.map((tool) => (
            <ToolCard 
              key={tool.href} 
              tool={tool} 
              isFavourite={favourites.includes(tool.href)} 
              toggleFavourite={toggleFavourite} 
            />
          ))}
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
