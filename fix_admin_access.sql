-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO FIX ADMIN ACCESS

-- Add the specific User ID (UUID) from the error message as an admin
INSERT INTO public.admins (user_id, role)
VALUES ('1e1a27d6-5e3b-4749-b395-16ae517b38e8', 'owner')
ON CONFLICT DO NOTHING; -- Avoid errors if already exists (though RLS might block, manual run bypasses RLS usually)

-- Ensure the user can actually see their own entry (if not already set)
-- This policy allows admins to read the admins table to verify they are admins
DROP POLICY IF EXISTS "Admins can view own entry" ON public.admins;
CREATE POLICY "Admins can view own entry" 
ON public.admins FOR SELECT 
USING (true); -- Verify admin status by reading the table

-- Ensure RLS on orders allows this new admin
-- The existing policy checks: EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()::text)
-- Since we added the UUID (auth.uid()) to the table, RLS should pass now.
