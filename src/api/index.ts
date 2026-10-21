import type { AccountApi } from './client';
import { LocalAccountApi } from './local/LocalAccountApi';
import { SupabaseAccountApi } from './supabase/SupabaseAccountApi';

/**
 * The one API instance: the ELUM platform on Supabase when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set (the same values as Write and Type), otherwise preview mode.
 */
const env = import.meta.env;
// ELUM runs on one Supabase project, so every build connects to it unless told otherwise. The
// address and publishable key are public (the database's row-level security protects the data).
// Browser-only preview mode is used only in tests, or when VITE_ELUM_PREVIEW=true on purpose.
const ELUM_SUPABASE_URL = 'https://afdnnvngrpdodsfwpaqo.supabase.co';
const ELUM_SUPABASE_KEY = 'sb_publishable_0o6tXC51UwLFHi8j8d9zcQ_xeB1eKyz';
const browserOnly = env.MODE === 'test' || env.VITE_ELUM_PREVIEW === 'true';
const url = browserOnly ? null : env.VITE_SUPABASE_URL?.trim() || ELUM_SUPABASE_URL;
const key = browserOnly ? null : env.VITE_SUPABASE_ANON_KEY?.trim() || ELUM_SUPABASE_KEY;
const typeDomain = env.VITE_ELUM_TYPE_DOMAIN?.trim() || 'type.elum.services';

export const api: AccountApi = url && key ? new SupabaseAccountApi(url, key, { typeDomain }) : new LocalAccountApi({ typeDomain });

export * from './types';
export type { AccountApi } from './client';
export { ApiError, errorMessage, isApiError } from './errors';
