import type { AccountApi } from './client';
import { LocalAccountApi } from './local/LocalAccountApi';
import { SupabaseAccountApi } from './supabase/SupabaseAccountApi';

/**
 * The one API instance: the ELUM platform on Supabase when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set (the same values as Write and Type), otherwise preview mode.
 */
const env = import.meta.env;
const url = env.VITE_SUPABASE_URL?.trim();
const key = env.VITE_SUPABASE_ANON_KEY?.trim();
const typeDomain = env.VITE_ELUM_TYPE_DOMAIN?.trim() || 'type.elum.services';

export const api: AccountApi = url && key ? new SupabaseAccountApi(url, key, { typeDomain }) : new LocalAccountApi({ typeDomain });

export * from './types';
export type { AccountApi } from './client';
export { ApiError, errorMessage, isApiError } from './errors';
