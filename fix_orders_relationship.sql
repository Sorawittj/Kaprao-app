-- Fix for PGRST200: Could not find a relationship between 'orders' and 'user_id'
-- This script adds a foreign key from orders.user_id to profiles.id
-- allowing PostgREST to resolve the join.

-- 1. Ensure profiles exist for all users in orders (Prevent FK violation)
-- Note: We rely on orders.user_id referencing auth.users, so we duplicate that ID to profiles.
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT DISTINCT user_id, 'Guest User', ''
FROM public.orders
WHERE user_id NOT IN (SELECT id FROM public.profiles)
AND user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Add the explicitly named Foreign Key for PostgREST
-- Use a DO block to safely handle existing constraints or simple logic
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey_profiles;

ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles (id);

-- 3. Verify/Refresh Schema Cache
-- (Supabase usually does this automatically on DDL, but good to know)
NOTIFY pgrst, 'reload config';
