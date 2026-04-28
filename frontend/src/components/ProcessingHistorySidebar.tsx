'use client';

import { useState, useEffect } from 'react';
import { History, X, Trash2, Clock, FileText } from 'lucide-react';
import { HistoryItem, getHistory, clearHistory } from '@/utils/history';

export function ProcessingHistorySidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadHistory = () => setHistory(getHistory());
    
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    
    loadHistory(); // Initial load
    
    window.addEventListener('nexpdf_history_update', loadHistory);
    window.addEventListener('nexpdf_history_open', handleOpen);
    window.addEventListener('nexpdf_history_close', handleClose);
    return () => {
      window.removeEventListener('nexpdf_history_update', loadHistory);
      window.removeEventListener('nexpdf_history_open', handleOpen);
      window.removeEventListener('nexpdf_history_close', handleClose);
    };
  }, []);

  if (!mounted) return null;

  const onClose = () => setIsOpen(false);

  if (!mounted) return null;

  const handleClear = () => {
    clearHistory();
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(new Date(timestamp));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 bottom-0 h-[100dvh] w-full sm:w-[420px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 transform transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl shadow-sm">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-tight">Activity Log</h2>
              <p className="text-xs text-muted-foreground font-medium">Your recent processed files</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-background border border-border hover:bg-muted rounded-full transition-colors shadow-sm"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-5 opacity-60">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No history yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                  Files you process during this session will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative border-l-2 border-muted ml-3 space-y-6 pb-4">
              {history.map((item, idx) => (
                <div key={item.id} className="relative pl-6 animate-in slide-in-from-right-4 fade-in" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}>
                  {/* Timeline Dot */}
                  <div className="absolute -left-[11px] top-1.5 h-5 w-5 rounded-full bg-background border-4 border-primary shadow-sm" />
                  
                  <div className="bg-card border border-border/60 hover:border-primary/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate" title={item.fileName}>
                          {item.fileName}
                        </h4>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 px-2.5 py-1 rounded-md">
                        <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                          {item.toolName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="p-5 border-t border-border/50 bg-card shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] z-10">
            <button 
              onClick={handleClear}
              className="w-full py-3.5 px-4 rounded-xl border border-red-500/20 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Clear Activity Log
            </button>
          </div>
        )}
      </div>
    </>
  );
}
