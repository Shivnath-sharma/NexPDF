'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';
import { toast } from 'sonner';

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except Shift for '?')
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();

      // Show/Hide help modal
      if (e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Escape closes modal
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // Tool navigation shortcuts
      const shortcuts: Record<string, { path: string; name: string }> = {
        m: { path: '/merge', name: 'Merge PDF' },
        s: { path: '/split', name: 'Split PDF' },
        o: { path: '/organize', name: 'PDF Editor Studio' },
        c: { path: '/compress', name: 'Compress PDF' },
        r: { path: '/rotate', name: 'Rotate PDF' },
        f: { path: '/form-filler', name: 'Form Filler' },
        h: { path: '/', name: 'Home' },
      };

      if (shortcuts[key] && !isOpen) {
        e.preventDefault();
        toast(`Navigating to ${shortcuts[key].name}...`, { icon: '🚀' });
        router.push(shortcuts[key].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Floating help button - optional, maybe just hidden since '?' triggers it */}
      {/* We can leave it completely hidden and just rely on '?' to discover, or add a subtle text somewhere. We'll just use the modal. */}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 pb-4 border-b border-border flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Keyboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
                <p className="text-sm text-muted-foreground">Navigate NexPDF like a pro.</p>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-muted/5">
              <ShortcutRow shortcut="?" description="Toggle this help menu" />
              <ShortcutRow shortcut="H" description="Go to Homepage" />
              <div className="h-px w-full bg-border" />
              <ShortcutRow shortcut="M" description="Merge PDF" />
              <ShortcutRow shortcut="S" description="Split PDF" />
              <ShortcutRow shortcut="O" description="PDF Editor Studio" />
              <ShortcutRow shortcut="C" description="Compress PDF" />
              <ShortcutRow shortcut="R" description="Rotate PDF" />
              <ShortcutRow shortcut="F" description="Form Filler" />
            </div>

            <div className="p-4 bg-muted/30 text-center border-t border-border">
              <p className="text-xs text-muted-foreground">
                Shortcuts are disabled while typing in text fields.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{description}</span>
      <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-muted-foreground shadow-sm">
        {shortcut}
      </kbd>
    </div>
  );
}
