import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://knbtwcxwdhyjvgncnzjo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_nXdgaJcI0K1zR_u0PvBlAg_SIImbEmw'

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)