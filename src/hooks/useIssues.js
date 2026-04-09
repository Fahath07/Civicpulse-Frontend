import { useState, useEffect } from 'react';
import api from '../services/api';

export function useIssues(endpoint = '/issues/my') {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(endpoint)
      .then(res => setIssues(res.data.issues || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { issues, setIssues, loading, error };
}
