import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rvhdtmycdktxgzzuumcr.supabase.co'

const supabaseAnonKey =
  'sb_publishable_Rbh59b5CsaLW6wTOBg3qUw_dDnHNy5a'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)