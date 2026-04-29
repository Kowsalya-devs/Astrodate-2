// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ykgbfrpkumlnogjdgqgb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZ2JmcnBrdW1sbm9namRncWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzM2MzgsImV4cCI6MjA3OTEwOTYzOH0.0RUq2i39uuwmeGcQ8ySwzz9NZOAUmmt7H51TE411F2M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});