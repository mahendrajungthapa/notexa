import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce a value - useful for search inputs.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Auto-save hook - calls save function after delay when content changes.
 */
export function useAutoSave(
  content: string,
  saveFn: (content: string) => Promise<void>,
  delay: number = 5000
) {
  const savedContentRef = useRef(content);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (content === savedContentRef.current) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveFn(content);
        savedContentRef.current = content;
      } catch {
        // silently fail - user can manually save
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [content, saveFn, delay]);

  return { isSaving };
}

/**
 * Paginated data fetching hook.
 */
export function usePagination<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; last_page: number; total: number }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn(page);
      setData(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    data, page, lastPage, total, loading,
    setPage, refresh: fetch,
  };
}

/**
 * Click outside handler for modals/dropdowns.
 */
export function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
