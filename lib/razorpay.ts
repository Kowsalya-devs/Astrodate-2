import * as WebBrowser from 'expo-web-browser';
const SUPABASE_URL = 'https://ykgbfrpkumlnogjdgqgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZ2JmcnBrdW1sbm9namRncWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzM2MzgsImV4cCI6MjA3OTEwOTYzOH0.0RUq2i39uuwmeGcQ8ySwzz9NZOAUmmt7H51TE411F2M';


const SUPABASE_CREATE_LINK_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/razorpay-link` : '';
const SUPABASE_STATUS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/razorpay-link-status` : '';

export type PlanCheckoutPayload = {
  planId: string;
  planName: string;
  amountPaise: number; // in paise
  currency?: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  callbackUrl?: string;
  userId?: string; // required for webhook to attribute payment
};

export async function createRazorpayPaymentLink(payload: PlanCheckoutPayload) {
  if (!SUPABASE_CREATE_LINK_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase function URL or anon key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const resp = await fetch(SUPABASE_CREATE_LINK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to create Razorpay payment link: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  if (!data?.short_url) {
    throw new Error('Razorpay payment link creation did not return short_url');
  }

  return {
    paymentLinkId: data.id as string,
    shortUrl: data.short_url as string,
    amountPaise: data.amount as number,
    currency: data.currency as string,
  };
}

export async function openRazorpayPaymentLink(shortUrl: string) {
  // Prefer external browser for a smooth hosted checkout experience
  const result = await WebBrowser.openBrowserAsync(shortUrl, {
    enableBarCollapsing: true,
    showTitle: true,
    dismissButtonStyle: 'close',
  });
  return result;
}

export async function checkRazorpayPaymentLinkStatus(paymentLinkId: string) {
  if (!SUPABASE_STATUS_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase function URL or anon key missing.');
  }
  const resp = await fetch(SUPABASE_STATUS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ id: paymentLinkId }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get payment link status: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return data as {
    id: string;
    status: 'created' | 'paid' | 'cancelled' | 'expired';
    amount: number;
    currency: string;
    short_url: string;
    notes: Record<string, any>;
    payments: any[];
  };
}
