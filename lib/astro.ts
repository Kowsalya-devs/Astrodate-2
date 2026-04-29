import { supabase } from '@/lib/supabase';

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
  mode?: "basic" | "full"; // <-- ADDED
};

export async function getAstroDetails(payload: AstroRequest) {
  const { data, error } = await supabase.functions.invoke("astro-details", {
    body: payload,
  });

  if (error) {
    console.log("Error from Astro Function:", error);
    throw error;
  }

  return data;
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
  const { data, error } = await supabase.functions.invoke("astro-details", {
    body: {
      ...payload,
      mode: "full", // Use full mode for horoscope
      language: payload.language || "en",
    },
  });

  if (error) {
    console.log("Error from Astro Function:", error);
    throw error;
  }

  return data;
}