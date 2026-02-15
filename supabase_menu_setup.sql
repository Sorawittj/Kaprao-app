
-- 1. Create Menu Table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id bigint generated always as identity primary key,
    name text not null,
    price int not null default 0,
    category text not null, -- 'kaprao', 'curry', 'noodle', etc.
    icon text,
    image text,
    description text,
    is_available boolean default true,
    is_new boolean default false,
    req_meat boolean default false, -- Requires meat selection?
    is_tray boolean default false,  -- Is it a tray set?
    kcal int,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.menu_items enable row level security;

-- 3. Policies
-- Everyone can view available items
CREATE POLICY "Public can view menu" ON public.menu_items
    FOR SELECT USING (true);

-- Only Admins can edit (using the admins table we created earlier)
CREATE POLICY "Admins can manage menu" ON public.menu_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    );

-- 4. Seed Data (Initial Import from your existing JS file)
INSERT INTO public.menu_items (name, price, icon, category, req_meat, is_tray, kcal, image, is_new, description)
VALUES 
('Set 1: Solo Tray (ลุยเดี่ยว)', 89, '📦', 'tray', false, true, 750, 'images/solo-tray.jpg', false, ''),
('Set 2: Buddy Tray (คู่หู)', 149, '🍱', 'tray', false, true, 1400, 'images/buddy-tray.jpg', false, ''),
('กะเพราหน่อไม้', 55, '🎍', 'kaprao', true, false, 350, 'images/kaprao-nor-mai.jpg', false, ''),
('กะเพราหมูสับ', 50, '🐷', 'kaprao', false, false, 520, 'images/kaprao-moo-sap.jpg', false, ''),
('กะเพราหมูเด้ง', 50, '🥓', 'kaprao', false, false, 550, 'images/kaprao-moo-deng.jpg', false, ''),
('กะเพราสันคอ', 50, '🥩', 'kaprao', false, false, 600, 'images/kaprao-san-ko.jpg', false, ''),
('กะเพราไข่เยี่ยวม้า', 60, '⚫', 'kaprao', false, false, 650, 'images/kaprao-kai-yiao-ma.jpg', false, ''),
('กะเพรากุ้ง', 60, '🦐', 'kaprao', false, false, 450, 'images/kaprao-kung.jpg', true, ''),
('กะเพราไก่', 50, '🐔', 'kaprao', false, false, 450, 'images/kaprao-kai.jpg', true, ''),
('กะเพราปลาหมึก', 60, '🦑', 'kaprao', false, false, 480, 'images/kaprao-pla-muek.jpg', true, ''),
('กะเพราหมูกรอบ', 65, '🥓', 'kaprao', false, false, 620, 'images/kaprao-moo-krob.jpg', true, ''),
('พริกแกงหมูชิ้น(สันคอ)', 50, '🥩', 'curry', false, false, 550, 'images/prik-kang-moo-chin.jpg', true, ''),
('พริกแกงหมูสับ', 50, '🐷', 'curry', false, false, 520, 'images/prik-kang-moo-sap.jpg', true, ''),
('พริกแกงหมูเด้ง', 50, '🥓', 'curry', false, false, 540, 'images/prik-kang-moo-deng.jpg', true, ''),
('พริกแกงกุ้ง', 60, '🦐', 'curry', false, false, 480, 'images/prik-kang-kung.jpg', true, ''),
('พริกแกงปลาหมึก', 60, '🦑', 'curry', false, false, 470, 'images/prik-kang-pla-muek.jpg', true, ''),
('พริกแกงไก่', 50, '🐔', 'curry', false, false, 450, 'images/prik-kang-kai.jpg', true, ''),
('มาม่าผัดกะเพรา', 50, '🍜', 'noodle', true, false, 450, 'images/mama-pad-kaprao.jpg', false, ''),
('กะเพราวุ้นเส้น', 55, '🍝', 'noodle', true, false, 400, 'images/kaprao-wun-sen.jpg', false, ''),
('หมูสับกระเทียม', 50, '🧄', 'garlic', false, false, 500, 'images/moo-sap-kra-thiam.jpg', false, ''),
('สันคอกระเทียม', 50, '🍖', 'garlic', false, false, 580, 'images/san-ko-kra-thiam.jpg', false, ''),
('หมูเด้งกระเทียม', 50, '🍘', 'garlic', false, false, 530, 'images/moo-deng-kra-thiam.jpg', false, ''),
('กุ้งกระเทียม', 60, '🍤', 'garlic', false, false, 480, 'images/kung-kra-thiam.jpg', true, ''),
('ต้มจืดไข่น้ำ (ไข่เจียว)', 40, '🥘', 'soup', false, false, 350, 'images/tom-jued-kai-nam.jpg', true, ''),
('ข้าวไข่ข้นพริกเผา', 40, '🌶️', 'others', false, false, 450, 'images/khai-khon-prik-pao.jpg', false, 'ไข่ 2 ฟอง'),
('ข้าวไข่ข้น', 40, '🍚', 'others', false, false, 380, 'images/khai-khon.jpg', false, 'ไข่ 2 ฟอง'),
('ข้าวไข่เจียวพริกสด', 50, '🥘', 'others', false, false, 420, 'images/khai-jiao-prik-sot.jpg', false, ''),
('ข้าวไข่ดาว 3 ฟอง', 50, '🍳', 'others', false, false, 480, 'images/khai-dao-3-fong.jpg', false, ''),
('หน่อไม้ผัดไข่', 50, '🎋', 'others', true, false, 300, 'images/nor-mai-pad-khai.jpg', false, ''),
('ข้าวไข่ข้นกุ้ง', 60, '🍳', 'others', false, false, 550, 'images/khai-khon-kung.jpg', true, ''),
('ข้าวผัดไข่', 50, '🍛', 'others', false, false, 520, 'images/khao-pad-khai.jpg', true, ''),
('ข้าวผัดหมูชิ้น (สันคอ)', 50, '🍛', 'others', false, false, 600, 'images/khao-pad-moo-chin.jpg', true, ''),
('กุ้งราดซอสมะขาม', 65, '🦐', 'others', false, false, 420, 'images/kung-rod-sot-makham.jpg', true, ''),
('ไข่ดาวราดซอสมะขาม', 50, '🍳', 'others', false, false, 380, 'images/khai-dao-rod-sot-makham.jpg', true, ''),
('เฉาก๊วยนมสด', 30, '🧊', 'dessert', false, false, 150, 'images/cha-kuey-nom-sot.jpg', false, ''),
('กล้วยเชื่อม', 25, '🍌', 'dessert', false, false, 220, 'images/kluay-chueam.jpg', false, '');
