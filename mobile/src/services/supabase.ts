import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '../utils/env';
import type { Database } from '../types/database';
import { sessionStorage } from './session-storage';

const { supabasePublishableKey, supabaseUrl } = getSupabaseEnv();

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
