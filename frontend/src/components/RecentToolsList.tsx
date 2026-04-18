'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TOOLS } from '@/config/tools';
import { Clock } from 'lucide-react';

export function RecentToolsList() {
  const [recentTools, setRecentTools] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nexpdf_recent_tools');
      if (stored) {
        const hrefs: string[] = JSON.parse(stored);
        const mappedTools = hrefs
          .map(href => TOOLS.find(t => t.href === href))
          .filter(Boolean);
        setRecentTools(mappedTools);
      }
    } catch (e) {
      console.error('Failed to parse recent tools from localStorage', e);
    }
  }, []);

  if (recentTools.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl px-4 mb-16">
      <div className="flex items-center mb-6 px-2">
        <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
        <h2 className="text-xl font-bold tracking-tight">Recently Used Tools</h2>
      </div>
      
      <div className="flex flex-wrap gap-4">
        {recentTools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group flex items-center gap-4 bg-card hover:bg-muted/50 border border-border p-4 rounded-xl transition-all duration-300 hover:shadow-lg w-full md:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1rem)] relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              <div className={`p-3 rounded-lg bg-gradient-to-br ${tool.color} text-white shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                <IconComponent className="w-5 h-5" />
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{tool.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{tool.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
