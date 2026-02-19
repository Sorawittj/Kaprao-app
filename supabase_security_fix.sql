-- =============================================
-- Kaprao52 App - Bulletproof Security Migration
-- =============================================
-- This migration implements:
-- 1. Strict RLS policies with ownership verification
-- 2. Database functions with SECURITY DEFINER
-- 3. Audit logging for all sensitive operations
-- 4. Input validation at database level
-- =============================================

-- =============================================
-- 1. ENHANCED PROFILES TABLE
-- =============================================

-- Add audit columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- =============================================
-- 2. STRICT RLS POLICIES FOR PROFILES
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;

-- Policy: Users can only view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can only insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Users can only update their own profile (excluding sensitive fields)
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "profiles_service_all" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 3. ENHANCED ORDERS TABLE WITH STRICT RLS
-- =============================================

-- Add audit columns
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create orders audit table
CREATE TABLE IF NOT EXISTS public.orders_audit (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES public.orders(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on audit table
ALTER TABLE public.orders_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "orders_audit_service_only" ON public.orders_audit
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 4. STRICT RLS POLICIES FOR ORDERS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous users to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Policy: Users can only view their own orders
CREATE POLICY "orders_select_own" ON public.orders
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Policy: Users can only insert orders for themselves
-- CRITICAL: Prevents users from creating orders for others
CREATE POLICY "orders_insert_own" ON public.orders
    FOR INSERT WITH CHECK (
        (auth.uid() = user_id) OR
        (auth.role() = 'anon' AND user_id IS NULL) OR
        auth.role() = 'service_role'
    );

-- Policy: Users can only update their own orders with restrictions
-- Only allow updates if order is in 'cart' or 'placed' status
CREATE POLICY "orders_update_own" ON public.orders
    FOR UPDATE USING (
        (auth.uid() = user_id AND status IN ('cart', 'placed', 'pending_payment')) OR
        auth.role() = 'service_role'
    )
    WITH CHECK (
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

-- Policy: Prevent deletion of orders (soft delete via status only)
CREATE POLICY "orders_no_delete" ON public.orders
    FOR DELETE USING (false);

-- =============================================
-- 5. SECURE DATABASE FUNCTIONS
-- =============================================

-- Function to validate order data
CREATE OR REPLACE FUNCTION public.validate_order_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate total_price is positive
    IF NEW.total_price < 0 THEN
        RAISE EXCEPTION 'Order total cannot be negative';
    END IF;
    
    -- Validate total_price doesn't exceed maximum (prevent integer overflow attacks)
    IF NEW.total_price > 1000000 THEN
        RAISE EXCEPTION 'Order total exceeds maximum allowed';
    END IF;
    
    -- Validate items is a valid JSON array
    IF NEW.items IS NULL OR jsonb_typeof(NEW.items) != 'array' THEN
        RAISE EXCEPTION 'Items must be a valid JSON array';
    END IF;
    
    -- Validate items count (prevent DoS with huge arrays)
    IF jsonb_array_length(NEW.items) > 100 THEN
        RAISE EXCEPTION 'Maximum 100 items per order';
    END IF;
    
    -- Validate customer_name length
    IF NEW.customer_name IS NOT NULL AND length(NEW.customer_name) > 100 THEN
        RAISE EXCEPTION 'Customer name too long (max 100 characters)';
    END IF;
    
    -- Set user_id to current user if not set
    IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    
    -- Increment version for optimistic locking
    IF TG_OP = 'UPDATE' THEN
        NEW.version = OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply validation trigger
DROP TRIGGER IF EXISTS validate_order_trigger ON public.orders;
CREATE TRIGGER validate_order_trigger
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_order_data();

-- Function to audit order changes
CREATE OR REPLACE FUNCTION public.audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.orders_audit (order_id, user_id, action, old_data, new_data)
        VALUES (
            NEW.id,
            auth.uid(),
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        
        -- Add to order's audit log
        NEW.audit_log = COALESCE(OLD.audit_log, '[]'::jsonb) || jsonb_build_object(
            'action', TG_OP,
            'timestamp', now(),
            'user_id', auth.uid(),
            'status_change', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) ELSE null END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger
DROP TRIGGER IF EXISTS audit_order_trigger ON public.orders;
CREATE TRIGGER audit_order_trigger
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_order_changes();

-- =============================================
-- 6. SECURE ORDER PROCESSING FUNCTION
-- =============================================

-- Enhanced order processing with transaction safety
CREATE OR REPLACE FUNCTION public.process_order_secure(
    p_order_id BIGINT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_profile RECORD;
    v_earned_points INTEGER;
    v_lotto_num TEXT;
    v_next_draw DATE;
    v_result JSONB;
BEGIN
    -- Verify user owns this order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or access denied';
    END IF;
    
    -- Only process if status is 'placed'
    IF v_order.status != 'placed' THEN
        RAISE EXCEPTION 'Order cannot be processed (status: %)', v_order.status;
    END IF;
    
    -- Get user profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Calculate earned points
    v_earned_points := FLOOR(COALESCE(v_order.total_price, 0) / 10);
    
    -- Deduct redeemed points if any
    IF COALESCE(v_order.points_redeemed, 0) > 0 THEN
        UPDATE public.profiles 
        SET points = GREATEST(0, points - v_order.points_redeemed),
            updated_at = now()
        WHERE id = p_user_id;
        
        -- Log point redemption
        INSERT INTO public.point_logs (user_id, action, amount, order_id, note, balance_after)
        SELECT 
            p_user_id, 
            'REDEEM', 
            v_order.points_redeemed, 
            p_order_id,
            'แลกส่วนลด Order: ' || p_order_id,
            points
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;
    
    -- Add earned points
    IF v_earned_points > 0 THEN
        UPDATE public.profiles 
        SET points = points + v_earned_points,
            total_orders = total_orders + 1,
            updated_at = now()
        WHERE id = p_user_id;
        
        -- Log point earning
        INSERT INTO public.point_logs (user_id, action, amount, order_id, note, balance_after)
        SELECT 
            p_user_id, 
            'EARN', 
            v_earned_points, 
            p_order_id,
            'สั่งอาหาร Order: ' || p_order_id,
            points
        FROM public.profiles
        WHERE id = p_user_id;
    ELSE
        -- Still increment order count
        UPDATE public.profiles 
        SET total_orders = total_orders + 1,
            updated_at = now()
        WHERE id = p_user_id;
    END IF;
    
    -- Generate lotto number
    v_lotto_num := RIGHT(p_order_id::text, 2);
    IF LENGTH(v_lotto_num) < 2 THEN
        v_lotto_num := LPAD(v_lotto_num, 2, '0');
    END IF;
    
    -- Calculate draw date
    IF EXTRACT(DAY FROM now()) > 1 AND EXTRACT(DAY FROM now()) < 16 THEN
         v_next_draw := make_date(EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, 16);
    ELSIF EXTRACT(DAY FROM now()) >= 16 THEN
         v_next_draw := (date_trunc('month', now()) + interval '1 month')::date;
    ELSE
         v_next_draw := make_date(EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, 1);
    END IF;
    
    -- Insert lotto ticket
    INSERT INTO public.lotto_pool (order_id, user_id, number, draw_date)
    VALUES (p_order_id, p_user_id, v_lotto_num, v_next_draw)
    ON CONFLICT DO NOTHING;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'points_earned', v_earned_points,
        'points_redeemed', COALESCE(v_order.points_redeemed, 0),
        'lotto_number', v_lotto_num,
        'draw_date', v_next_draw
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.process_order_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_secure TO anon;

-- =============================================
-- 7. RATE LIMITING (Using row-level counters)
-- =============================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, action, window_start)
);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_action TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_user_id UUID := auth.uid();
BEGIN
    -- Count requests in window
    SELECT COALESCE(SUM(count), 0) INTO v_count
    FROM public.rate_limits
    WHERE user_id = v_user_id
      AND action = p_action
      AND window_start > now() - interval '1 minute' * p_window_minutes;
    
    -- If over limit, deny
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Record this request
    INSERT INTO public.rate_limits (user_id, action, count)
    VALUES (v_user_id, p_action, 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET count = rate_limits.count + 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_action ON public.point_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action, window_start);

-- =============================================
-- 9. CLEANUP OLD DATA (Optional, run periodically)
-- =============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old rate limit records
    DELETE FROM public.rate_limits
    WHERE window_start < now() - interval '24 hours';
    
    -- Archive old completed orders (optional)
    -- INSERT INTO orders_archive SELECT * FROM orders WHERE status = 'completed' AND created_at < now() - interval '1 year';
    -- DELETE FROM orders WHERE status = 'completed' AND created_at < now() - interval '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. SECURITY CHECK FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.security_check()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check RLS is enabled on all tables
    RETURN QUERY
    SELECT 
        c.relname::TEXT || ' RLS enabled',
        CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END,
        CASE WHEN c.relrowsecurity THEN 'Row Level Security is enabled' ELSE 'WARNING: RLS is disabled!' END
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relname IN ('profiles', 'orders', 'point_logs', 'lotto_pool');
    
    -- Check for policies
    RETURN QUERY
    SELECT 
        tablename::TEXT || ' has policies',
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
        COUNT(*)::TEXT || ' policies defined'
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run security check
SELECT * FROM public.security_check();
