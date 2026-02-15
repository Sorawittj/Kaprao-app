
-- 1. Create Legacy Members Table (ตารางพักข้อมูลเก่า)
CREATE TABLE IF NOT EXISTS public.legacy_members (
    line_user_id text primary key, -- รหัส LINE เดิม (Uxxxxxxxx...)
    points int default 0,
    total_orders int default 0,
    old_name text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.legacy_members enable row level security;
CREATE POLICY "Public read legacy" on public.legacy_members for select using (true);
CREATE POLICY "Admin insert legacy" on public.legacy_members for insert with check (true); 
CREATE POLICY "Admin delete legacy" on public.legacy_members for delete using (true);


-- 2. Function to Migrate Points (ฟังก์ชันกู้คืนแต้มแบบปลอดภัย)
CREATE OR REPLACE FUNCTION public.migrate_legacy_points(
    uid uuid,              -- User ID ปัจจุบัน (Supabase UUID)
    l_points int,          -- แต้มที่จะกู้คืน
    l_orders int           -- จำนวนออเดอร์ที่จะกู้คืน
)
RETURNS void AS $$
BEGIN
    -- อัปเดตข้อมูลลูกค้าปัจจุบัน เพิ่มแต้มเก่าเข้าไป
    UPDATE public.profiles
    SET points = points + l_points,
        total_orders = total_orders + l_orders
    WHERE id = uid;
    
    -- (Optionally) Log this migration in point_logs if needed
    INSERT INTO public.point_logs (user_id, action, amount, note, balance_after)
    VALUES (uid, 'MIGRATE', l_points, 'Legacy System Migration', (SELECT points FROM public.profiles WHERE id = uid));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
