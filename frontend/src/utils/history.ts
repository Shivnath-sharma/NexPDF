export interface HistoryItem {
  id: string;
  toolName: string;
  fileName: string;
  timestamp: number;
}

export function addHistoryItem(toolName: string, fileName: string) {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const newItem: HistoryItem = {
    id: Date.now().toString(),
    toolName,
    fileName,
    timestamp: Date.now(),
  };
  const newHistory = [newItem, ...history].slice(0, 50); // Keep last 50 items
  localStorage.setItem('nexpdf_history', JSON.stringify(newHistory));
  window.dispatchEvent(new Event('nexpdf_history_update'));
}

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('nexpdf_history');
  return stored ? JSON.parse(stored) : [];
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nexpdf_history');
  window.dispatchEvent(new Event('nexpdf_history_update'));
}
