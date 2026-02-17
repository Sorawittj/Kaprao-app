// =============================================
// Kaprao52 App - Menu Data
// =============================================

// Kaprao52 App - Menu Data
// =============================================

let menuItems = [
    { id: 201, name: "Set 1: Solo Tray (ลุยเดี่ยว)", price: 89, icon: "📦", category: "tray", reqMeat: false, isTray: true, trayType: 1, kcal: 750, image: "images/solo-tray.jpg" },
    { id: 202, name: "Set 2: Buddy Tray (คู่หู)", price: 149, icon: "🍱", category: "tray", reqMeat: false, isTray: true, trayType: 2, kcal: 1400, image: "images/buddy-tray.jpg" },
    { id: 2, name: "กะเพราหน่อไม้", price: 55, icon: "🎍", category: "kaprao", reqMeat: true, kcal: 350, image: "images/kaprao-nor-mai.jpg" },
    { id: 3, name: "กะเพราหมูสับ", price: 50, icon: "🐷", category: "kaprao", reqMeat: false, kcal: 520, image: "images/kaprao-moo-sap.jpg" },
    { id: 4, name: "กะเพราหมูเด้ง", price: 50, icon: "🥓", category: "kaprao", reqMeat: false, kcal: 550, image: "images/kaprao-moo-deng.jpg" },
    { id: 5, name: "กะเพราสันคอ", price: 50, icon: "🥩", category: "kaprao", reqMeat: false, kcal: 600, image: "images/kaprao-san-ko.jpg" },
    { id: 6, name: "กะเพราไข่เยี่ยวม้า", price: 60, icon: "⚫", category: "kaprao", reqMeat: false, kcal: 650, image: "images/kaprao-kai-yiao-ma.jpg" },
    { id: 102, name: "กะเพรากุ้ง", price: 60, icon: "🦐", category: "kaprao", reqMeat: false, kcal: 450, isNew: true, image: "images/kaprao-kung.jpg" },
    { id: 105, name: "กะเพราไก่", price: 50, icon: "🐔", category: "kaprao", reqMeat: false, kcal: 450, isNew: true, image: "images/kaprao-kai.jpg" },
    { id: 108, name: "กะเพราปลาหมึก", price: 60, icon: "🦑", category: "kaprao", reqMeat: false, kcal: 480, isNew: true, image: "images/kaprao-pla-muek.jpg" },
    { id: 109, name: "กะเพราหมูกรอบ", price: 65, icon: "🥓", category: "kaprao", reqMeat: false, kcal: 620, isNew: true, image: "images/kaprao-moo-krob.jpg" },
    { id: 301, name: "พริกแกงหมูชิ้น(สันคอ)", price: 50, icon: "🥩", category: "curry", reqMeat: false, kcal: 550, isNew: true, image: "images/prik-kang-moo-chin.jpg" },
    { id: 302, name: "พริกแกงหมูสับ", price: 50, icon: "🐷", category: "curry", reqMeat: false, kcal: 520, isNew: true, image: "images/prik-kang-moo-sap.jpg" },
    { id: 303, name: "พริกแกงหมูเด้ง", price: 50, icon: "🥓", category: "curry", reqMeat: false, kcal: 540, isNew: true, image: "images/prik-kang-moo-deng.jpg" },
    { id: 304, name: "พริกแกงกุ้ง", price: 60, icon: "🦐", category: "curry", reqMeat: false, kcal: 480, isNew: true, image: "images/prik-kang-kung.jpg" },
    { id: 305, name: "พริกแกงปลาหมึก", price: 60, icon: "🦑", category: "curry", reqMeat: false, kcal: 470, isNew: true, image: "images/prik-kang-pla-muek.jpg" },
    { id: 306, name: "พริกแกงไก่", price: 50, icon: "🐔", category: "curry", reqMeat: false, kcal: 450, isNew: true, image: "images/prik-kang-kai.jpg" },
    { id: 10, name: "มาม่าผัดกะเพรา", price: 50, icon: "🍜", category: "noodle", reqMeat: true, kcal: 450, image: "images/mama-pad-kaprao.jpg" },
    { id: 1, name: "กะเพราวุ้นเส้น", price: 55, icon: "🍝", category: "noodle", reqMeat: true, kcal: 400, image: "images/kaprao-wun-sen.jpg" },
    { id: 7, name: "หมูสับกระเทียม", price: 50, icon: "🧄", category: "garlic", reqMeat: false, kcal: 500, image: "images/moo-sap-kra-thiam.jpg" },
    { id: 8, name: "สันคอกระเทียม", price: 50, icon: "🍖", category: "garlic", reqMeat: false, kcal: 580, image: "images/san-ko-kra-thiam.jpg" },
    { id: 9, name: "หมูเด้งกระเทียม", price: 50, icon: "🍘", category: "garlic", reqMeat: false, kcal: 530, image: "images/moo-deng-kra-thiam.jpg" },
    { id: 103, name: "กุ้งกระเทียม", price: 60, icon: "🍤", category: "garlic", reqMeat: false, kcal: 480, isNew: true, image: "images/kung-kra-thiam.jpg" },
    { id: 101, name: "ต้มจืดไข่น้ำ (ไข่เจียว)", price: 40, icon: "🥘", category: "soup", reqMeat: false, kcal: 350, isNew: true, image: "images/tom-jued-kai-nam.jpg" },
    { id: 11, name: "ข้าวไข่ข้นพริกเผา", price: 40, icon: "🌶️", category: "others", reqMeat: false, desc: "ไข่ 2 ฟอง", kcal: 450, image: "images/khai-khon-prik-pao.jpg" },
    { id: 12, name: "ข้าวไข่ข้น", price: 40, icon: "🍚", category: "others", reqMeat: false, desc: "ไข่ 2 ฟอง", kcal: 380, image: "images/khai-khon.jpg" },
    { id: 13, name: "ข้าวไข่เจียวพริกสด", price: 50, icon: "🥘", category: "others", reqMeat: false, kcal: 420, image: "images/khai-jiao-prik-sot.jpg" },
    { id: 14, name: "ข้าวไข่ดาว 3 ฟอง", price: 50, icon: "🍳", category: "others", reqMeat: false, kcal: 480, image: "images/khai-dao-3-fong.jpg" },
    { id: 15, name: "หน่อไม้ผัดไข่", price: 50, icon: "🎋", category: "others", reqMeat: true, kcal: 300, image: "images/nor-mai-pad-khai.jpg" },
    { id: 104, name: "ข้าวไข่ข้นกุ้ง", price: 60, icon: "🍳", category: "others", reqMeat: false, kcal: 550, isNew: true, image: "images/khai-khon-kung.jpg" },
    { id: 106, name: "ข้าวผัดไข่", price: 50, icon: "🍛", category: "others", reqMeat: false, kcal: 520, isNew: true, image: "images/khao-pad-khai.jpg" },
    { id: 107, name: "ข้าวผัดหมูชิ้น (สันคอ)", price: 50, icon: "🍛", category: "others", reqMeat: false, kcal: 600, isNew: true, image: "images/khao-pad-moo-chin.jpg" },
    { id: 110, name: "กุ้งราดซอสมะขาม", price: 65, icon: "🦐", category: "others", reqMeat: false, kcal: 420, isNew: true, image: "images/kung-rod-sot-makham.jpg" },
    { id: 111, name: "ไข่ดาวราดซอสมะขาม", price: 50, icon: "🍳", category: "others", reqMeat: false, kcal: 380, isNew: true, image: "images/khai-dao-rod-sot-makham.jpg" },
    { id: 20, name: "เฉาก๊วยนมสด", price: 30, icon: "🧊", category: "dessert", reqMeat: false, kcal: 150, image: "images/cha-kuey-nom-sot.jpg" },
    { id: 21, name: "กล้วยเชื่อม", price: 25, icon: "🍌", category: "dessert", reqMeat: false, kcal: 220, image: "images/kluay-chueam.jpg" },
];
