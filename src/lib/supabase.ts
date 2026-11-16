import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('YOUR_PROJECT_REF') &&
    !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'royal-immo-auth-token',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export interface SupabaseConnectionCheck {
  configured: boolean;
  reachable: boolean;
  schemaReady: boolean;
  authReady: boolean;
  categoriesCount: number;
  locationsCount: number;
  agenciesCount: number;
  propertiesCount: number;
  errorMessage?: string;
}

export async function testSupabaseConnection(): Promise<SupabaseConnectionCheck> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      reachable: false,
      schemaReady: false,
      authReady: false,
      categoriesCount: 0,
      locationsCount: 0,
      agenciesCount: 0,
      propertiesCount: 0,
      errorMessage: 'Variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquantes.',
    };
  }

  try {
    const authRes = await supabase.auth.getSession();
    const authReady = !authRes.error;

    const [plansRes, agRes, propRes, profRes] = await Promise.all([
      supabase.from('publication_plans').select('id', { count: 'exact', head: true }),
      supabase.from('agencies').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const schemaError = plansRes.error || agRes.error || propRes.error || profRes.error;

    return {
      configured: true,
      reachable: true,
      schemaReady: !schemaError,
      authReady,
      categoriesCount: 12,
      locationsCount: 20,
      agenciesCount: agRes.count ?? 0,
      propertiesCount: propRes.count ?? 0,
      errorMessage: schemaError ? schemaError.message : undefined,
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      schemaReady: false,
      authReady: false,
      categoriesCount: 0,
      locationsCount: 0,
      agenciesCount: 0,
      propertiesCount: 0,
      errorMessage: (err as Error).message,
    };
  }
}
