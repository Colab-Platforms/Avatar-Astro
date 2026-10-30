import { useState, useCallback } from 'react';
import { apiService, API_BASE_URL } from '@/lib/api';
import { authedFetch, SignInRequiredError } from '@/lib/authedFetch';

interface HumanReadableInterpretation {
  summary: string;
  personality: string;
  strengths: string[];
  challenges: string[];
  compatibility: string;
  careerGuidance: string;
  lifeAdvice: string;
}

interface UseInterpretationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Hook to interpret birth chart with ChatGPT
export function useInterpretBirthChart() {
  const [state, setState] = useState<UseInterpretationState<HumanReadableInterpretation>>({
    data: null,
    loading: false,
    error: null,
  });

  const interpret = useCallback(async (birthData: any) => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await authedFetch(`${API_BASE_URL}/interpretation/birth-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ birthData }),
      });

      if (!response.ok) {
        throw new Error('Failed to interpret birth chart');
      }

      const result = await response.json();
      setState({ data: result.data, loading: false, error: null });
      return result.data;
    } catch (err: any) {
      const error = err.message || 'Failed to interpret birth chart';
      setState({ data: null, loading: false, error });
      throw err;
    }
  }, []);

  return { ...state, interpret };
}

// Hook to generate AI-powered daily horoscope
export function useAIDailyHoroscope(sign: string) {
  const [state, setState] = useState<UseInterpretationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!sign) return null;
    setState({ data: null, loading: true, error: null });
    try {
      // window.fetch on purpose: the local callback below is also named `fetch` and would otherwise call itself.
      const response = await window.fetch(`${API_BASE_URL}/interpretation/horoscope/${sign}`);

      if (!response.ok) {
        throw new Error('Failed to generate horoscope');
      }

      const result = await response.json();
      setState({ data: result.data, loading: false, error: null });
      return result.data;
    } catch (err: any) {
      const error = err.message || 'Failed to generate horoscope';
      setState({ data: null, loading: false, error });
      throw err;
    }
  }, [sign]);

  return { ...state, fetch };
}

// Hook to generate AI-powered compatibility analysis
export function useAICompatibility(sign1: string, sign2: string) {
  const [state, setState] = useState<UseInterpretationState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!sign1 || !sign2) return null;
    setState({ data: null, loading: true, error: null });
    try {
      const response = await authedFetch(
        `${API_BASE_URL}/interpretation/compatibility?sign1=${sign1}&sign2=${sign2}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate compatibility analysis');
      }

      const result = await response.json();
      setState({ data: result.data, loading: false, error: null });
      return result.data;
    } catch (err: any) {
      const error = err.message || 'Failed to generate compatibility analysis';
      setState({ data: null, loading: false, error });
      throw err;
    }
  }, [sign1, sign2]);

  return { ...state, fetch };
}
