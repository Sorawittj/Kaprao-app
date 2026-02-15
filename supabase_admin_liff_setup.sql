
-- 1. ล้างข้อมูล Admin เดิมทั้งหมด
TRUNCATE TABLE public.admins RESTART IDENTITY;

-- 2. เพิ่ม Admin ใหม่ 2 ท่าน (User ID จาก LINE)
INSERT INTO public.admins (user_id, role)
VALUES 
('U8f3b0668fc8e9e2d062e7716a7c02fff', 'owner'),
('U6ec1f5a047384d71e047b2a5c6d8b3ae', 'owner'),
('1e1a27d6-5e3b-4749-b395-16ae517b38e8', 'owner');

-- 3. ตรวจสอบ Policies (สำคัญมาก สำหรับการเข้าถึงด้วย User ID)
-- อนุญาตให้ Admin อ่านข้อมูลตัวเอง
DROP POLICY IF EXISTS "Admins can view own entry" ON public.admins;
CREATE POLICY "Admins can view own entry" 
ON public.admins FOR SELECT 
USING (true); -- เปิดให้อ่านได้ เพื่อเช็คว่า User ID นี้เป็น Admin ไหม

-- อนุญาตให้ Admin จัดการ Orders (แก้ Policy ให้รองรับ Text User ID)
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" 
ON public.orders FOR ALL 
USING (
    -- เช็คว่า User ID ของคนที่กำลังทำรายการ มีอยู่ในตาราง admins หรือไม่
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()::text)
    OR
    -- กรณี Client-side ส่ง user_id มาใน query (ไม่แนะนำใน Production แต่จำเป็นสำหรับ LIFF ตอนนี้)
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = current_setting('request.jwt.claim.sub', true))
);
