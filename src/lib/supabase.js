import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL      = 'https://knbtwcxwdhyjvgncnzjo.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_nXdgaJcI0K1zR_u0PvBlAg_SIImbEmw'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)