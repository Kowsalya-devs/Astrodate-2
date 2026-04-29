import { supabase } from './supabase';

export type MembershipSummary = {
  user_id: string;
  plan_id: string | null;
  plan_slug: string | null;
  plan_name: string | null;
  plan_badge: string | null;
  features: Record<string, any> | null;
  status: 'incomplete' | 'active' | 'past_due' | 'canceled' | 'expired' | null;
  current_period_end: string | null;
  is_active: boolean;
};

export async function getCurrentMembership(): Promise<{ success: boolean; data?: MembershipSummary | null; error?: string }>{
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { success: false, error: 'User not authenticated' };
    }
    const { data, error } = await supabase.rpc('get_my_membership');
    if (error) return { success: false, error: error.message };
    const row: MembershipSummary | null = (Array.isArray(data) && data.length > 0) ? data[0] : null;
    return { success: true, data: row };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function hasFeature(featureKey: string): Promise<boolean> {
  const { success, data } = await getCurrentMembership();
  if (!success || !data || !data.features) return false;
  const value = (data.features as any)[featureKey];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

export async function getBadge(): Promise<string> {
  const { success, data } = await getCurrentMembership();
  if (!success || !data) return 'Free';
  return data.plan_badge ?? (data.is_active ? 'Member' : 'Free');
}

export async function getMembershipOrFree(): Promise<MembershipSummary> {
  const res = await getCurrentMembership();
  if (res.success && res.data) return res.data;
  return {
    user_id: (await supabase.auth.getUser()).data.user?.id ?? '',
    plan_id: null,
    plan_slug: 'free',
    plan_name: 'Free',
    plan_badge: 'Free',
    features: {},
    status: null,
    current_period_end: null,
    is_active: false,
  };
}
