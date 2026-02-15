
-- 1. Create Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid references auth.users not null primary key,
  role text default 'owner',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Insert Your User ID as Admin (Prevent duplicate error)
INSERT INTO public.admins (user_id)
VALUES ('31f2177b-fd04-486b-97cd-3d7ca8973217')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Enable RLS on Admins table
ALTER TABLE public.admins enable row level security;
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (auth.uid() = user_id);

-- 4. Update Orders Policy to allow Admin access
-- Drop existing restrict policies if needed, or add new permissive policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

CREATE POLICY "Admins can manage all orders" ON public.orders
FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- 5. Helper View for Admin Dashboard (Optional but useful)
CREATE OR REPLACE VIEW public.admin_orders_view AS
SELECT 
    o.id,
    o.created_at,
    o.status,
    o.total_price,
    o.items,
    p.display_name as customer_name,
    p.avatar_url,
    o.user_id
FROM public.orders o
LEFT JOIN public.profiles p ON o.user_id = p.id
ORDER BY o.created_at DESC;

-- Grant access to view
GRANT SELECT ON public.admin_orders_view TO authenticated;
-- Note: RLS on underlying tables (orders, profiles) still applies!
-- So Admin needs RLS policy on profiles too to see customer names.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);
