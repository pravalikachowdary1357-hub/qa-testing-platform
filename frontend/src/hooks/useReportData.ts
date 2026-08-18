import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';

interface ReportDataState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

// Shared fetch/loading/error/refresh boilerplate for every report tab --
// each tab just supplies its own fetcher + current filter values.
export function useReportData<T>(fetcher: () => Promise<T>, deps: unknown[]): ReportDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load report (HTTP ${err.status}). ${err.message}`
            : 'Failed to load report. Is the backend running?',
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshToken]);

  return { data, error, loading, refresh: () => setRefreshToken((token) => token + 1) };
}
