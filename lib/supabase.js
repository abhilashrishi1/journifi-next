'use client';

import { createClient } from '@supabase/supabase-js';

const createSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const getSupabase = () => {
  if (typeof window === 'undefined') return null;
  return createSupabaseClient();
};

export const supabase = createSupabaseClient();
