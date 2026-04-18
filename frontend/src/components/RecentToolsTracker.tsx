'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TOOLS } from '@/config/tools';

export function RecentToolsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only track if the current path is a known tool
    const currentTool = TOOLS.find(t => t.href === pathname);
    
    if (currentTool) {
      try {
        const stored = localStorage.getItem('nexpdf_recent_tools');
        let recentTools: string[] = stored ? JSON.parse(stored) : [];
        
        // Remove current tool if it exists so we can move it to the top
        recentTools = recentTools.filter(href => href !== pathname);
        
        // Add to the front
        recentTools.unshift(pathname);
        
        // Keep only top 3
        recentTools = recentTools.slice(0, 3);
        
        localStorage.setItem('nexpdf_recent_tools', JSON.stringify(recentTools));
      } catch (e) {
        console.error('Failed to save recent tools to localStorage', e);
      }
    }
  }, [pathname]);

  return null;
}
