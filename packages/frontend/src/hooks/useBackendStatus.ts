import { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export type BackendStatus = 'checking' | 'online' | 'offline';

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch(`${BACKEND_URL}/`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled) {
          setStatus(response.ok ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) {
          setStatus('offline');
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
