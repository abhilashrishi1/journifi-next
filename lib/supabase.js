import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

function getSupabase() {
  if (supabaseInstance) return supabaseInstance;
  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
  return supabaseInstance;
}

export const supabase = typeof window !== 'undefined' 
  ? getSupabase() 
  : { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signInWithPassword: async () => ({}), signUp: async () => ({}), signOut: async () => {}, signInWithOAuth: async () => {} }, from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }), insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }), upsert: async () => ({}) }) };
