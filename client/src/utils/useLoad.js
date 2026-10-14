// src/utils/useLoad.js
// Tiny data-loading hook for dashboard sections. Each section loads
// independently, so one failing request shows an error in that section only
// instead of blanking the whole page. `loader` must be a stable function
// (define it at module level). Returns { data, loading, error, reload }.

import { useCallback, useEffect, useState } from 'react';

export function useLoad(loader, enabled = true) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err.response?.data?.message || 'Could not load this data.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loader, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
