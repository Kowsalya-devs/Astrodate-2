import { supabase } from '@/lib/supabase';
import { invokeSupabaseFunctionWithTimeout } from './network';
import type { VedicMatchReport } from '@/lib/astro-types';


export type AstroRequest = {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number;
  language?: string;
  mode?: 'basic' | 'full';
};

export async function getAstroDetails(payload: AstroRequest) {
  try {
    const { data, error } = await invokeSupabaseFunctionWithTimeout(
      () => supabase.functions.invoke('astro-details', { body: payload }),
      20000
    );
    if (error) {
      console.warn('[astro] getAstroDetails non-fatal error:', error.message ?? error);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('[astro] getAstroDetails exception (non-fatal):', err?.message ?? err);
    return null;
  }
}

export type DailyHoroscopeRequest = {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number;
  language?: string;
};

export async function getDailyHoroscope(payload: DailyHoroscopeRequest) {
  try {
    const { data, error } = await invokeSupabaseFunctionWithTimeout(
      () =>
        supabase.functions.invoke('astro-details', {
          body: { ...payload, mode: 'full', language: payload.language || 'en' },
        }),
      20000
    );
    if (error) {
      console.warn('[astro] getDailyHoroscope non-fatal error:', error.message ?? error);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('[astro] getDailyHoroscope exception (non-fatal):', err?.message ?? err);
    return null;
  }
}

export type BirthPayload = {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number;
};

export type ZodiacCompatibilityResult = {
  compatibility_percentage: number;
  compatibility_report: string;
};

export async function getZodiacCompatibility(
  userSign: string,
  partnerSign: string
): Promise<ZodiacCompatibilityResult | null> {
  try {
    const { data, error } = await invokeSupabaseFunctionWithTimeout(
      () =>
        supabase.functions.invoke('astro-compatibility', {
          body: { type: 'western_signs', userSign, partnerSign },
        }),
      20000
    );
    if (error) return null;
    return data as ZodiacCompatibilityResult;
  } catch {
    return null;
  }
}

export async function getVedicMatchReport(
  male: BirthPayload,
  female: BirthPayload
): Promise<VedicMatchReport | null> {
  try {
    const { data, error } = await invokeSupabaseFunctionWithTimeout(
      () =>
        supabase.functions.invoke('astro-compatibility', {
          body: { type: 'vedic_match', male, female },
        }),
      30000
    );
    if (error) return null;
    return data as VedicMatchReport;
  } catch {
    return null;
  }
}

export type { VedicMatchReport, VedicKootaDetail } from '@/lib/astro-types';