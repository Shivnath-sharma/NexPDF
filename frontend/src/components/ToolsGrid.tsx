'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Star, GripHorizontal } from 'lucide-react';
import { TOOLS } from '@/config/tools';

// Extracted ToolCard to reuse for both Favourites and All Tools grids
function ToolCard({ 
  tool, 
  isFavourite, 
  toggleFavourite,
  draggable,
  onDragStart,
  onDragOver,
  onDrop
}: { 
  tool: any;
  isFavourite: boolean;
  toggleFavourite: (href: string, e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, href: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, href: string) => void;
}) {
  const IconComponent = tool.icon;
  
  return (
    <Link
      href={tool.href}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, tool.href)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, tool.href)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-6 border border-border transition-all duration-300 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[420px] hover:shadow-2xl hover:-translate-y-2 hover:border-primary/50 dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tool.color} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 -mr-10 -mt-10`}></div>
      
      {/* Drag Handle (visual only, HTML5 drag works on the whole card) */}
      {draggable && (
        <div className="absolute top-4 left-4 z-10 p-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripHorizontal className="h-4 w-4" />
        </div>
      )}

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
        <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} p-3 mb-5 text-white shadow-lg ${tool.shadow} transform group-hover:scale-110 transition-transform duration-300 ${draggable ? 'ml-6' : ''}`}>
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
  const [orderedTools, setOrderedTools] = useState(TOOLS);
  const [mounted, setMounted] = useState(false);
  
  const draggedItemRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const storedFavs = localStorage.getItem('nexpdf_favourites');
      if (storedFavs) setFavourites(JSON.parse(storedFavs));

      const storedOrder = localStorage.getItem('nexpdf_tool_order');
      if (storedOrder) {
        const orderArray = JSON.parse(storedOrder);
        // Reconstruct tools based on saved order hrefs, appending any new tools not in the saved order
        const sorted = [...TOOLS].sort((a, b) => {
          const idxA = orderArray.indexOf(a.href);
          const idxB = orderArray.indexOf(b.href);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setOrderedTools(sorted);
      }
    } catch (e) {
      console.error('Failed to load preferences', e);
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

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, href: string) => {
    draggedItemRef.current = href;
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before we might add styling
    setTimeout(() => {
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetHref: string) => {
    e.preventDefault();
    const sourceHref = draggedItemRef.current;
    
    // Reset opacity of source
    const items = document.querySelectorAll('[draggable="true"]');
    items.forEach(item => {
      (item as HTMLElement).style.opacity = '1';
    });

    if (!sourceHref || sourceHref === targetHref) return;

    setOrderedTools(prev => {
      const sourceIndex = prev.findIndex(t => t.href === sourceHref);
      const targetIndex = prev.findIndex(t => t.href === targetHref);
      
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const newOrder = [...prev];
      const [movedItem] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);

      // Save new order to localStorage
      try {
        localStorage.setItem('nexpdf_tool_order', JSON.stringify(newOrder.map(t => t.href)));
      } catch (err) {}

      return newOrder;
    });
    
    draggedItemRef.current = null;
  };

  // ------------------------------

  const filteredTools = orderedTools.filter(tool => 
    tool.name.toLowerCase().includes(query.toLowerCase()) || 
    tool.description.toLowerCase().includes(query.toLowerCase())
  );

  const favouriteTools = orderedTools.filter(tool => favourites.includes(tool.href));

  // If not mounted yet to avoid hydration mismatch, just render the main grid without favourites/custom order
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
          {TOOLS.map((tool) => (
            <ToolCard key={tool.href} tool={tool} isFavourite={false} toggleFavourite={() => {}} />
          ))}
        </div>
      </section>
    );
  }

  const isSearching = query.length > 0;

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
      {!isSearching && favouriteTools.length > 0 && (
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
                // Reordering favourites can be confusing, keep it simple for now
              />
            ))}
          </div>
        </div>
      )}

      {/* All Tools Section Header */}
      {!isSearching && favouriteTools.length > 0 && (
        <div className="w-full flex items-center mb-6 ml-2">
          <h2 className="text-2xl font-bold">All Tools</h2>
          <span className="ml-4 text-sm text-muted-foreground">Drag cards to reorder</span>
        </div>
      )}
      {!isSearching && favouriteTools.length === 0 && (
        <div className="w-full flex items-center mb-6 ml-2">
           <span className="text-sm text-muted-foreground">Drag cards to reorder</span>
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
              draggable={!isSearching} // Only allow dragging when not searching
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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
