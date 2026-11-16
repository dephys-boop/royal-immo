import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { slugify } from '../utils/format';

export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'individual' | 'agency' | 'customer';
  agencyName?: string;
  city?: string;
}

export const authService = {
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!isSupabaseConfigured || !supabase) {
      return { unsubscribe: () => {} };
    }
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },

  async signIn(email: string, password: string): Promise<{ session: Session | null; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { session: null, profile: null, error: 'Supabase non configuré.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { session: null, profile: null, error: error.message };
    }

    let profile: Profile | null = null;
    if (data.user) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      profile = (profData as Profile | null) || null;
    }

    return { session: data.session, profile };
  },

  async signUp(payload: SignUpPayload): Promise<{ session: Session | null; requiresEmailConfirmation: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { session: null, requiresEmailConfirmation: false, error: 'Supabase non configuré.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          phone: payload.phone,
          role: payload.role,
          city: payload.city || 'Abidjan',
        },
      },
    });

    if (error) {
      return { session: null, requiresEmailConfirmation: false, error: error.message };
    }

    if (data.user && data.session && payload.role === 'agency' && payload.agencyName) {
      await supabase.from('agencies').insert({
        owner_id: data.user.id,
        name: payload.agencyName,
        slug: `${slugify(payload.agencyName)}-${Date.now().toString().slice(-4)}`,
        address: payload.city || 'Abidjan',
        city: payload.city || 'Abidjan',
        phone: payload.phone,
        whatsapp: payload.phone,
        email: payload.email,
      });
    }

    return {
      session: data.session,
      requiresEmailConfirmation: Boolean(data.user && !data.session),
    };
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
};
