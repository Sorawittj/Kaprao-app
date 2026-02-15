
// =============================================
// MENU LOADER: Supabase -> Local
// =============================================
// Replaces static js/data/menu.js logic using window.menuItems

window.fetchMenuFromSupabase = async function () {
    if (!window.supabaseClient) {
        console.error("Supabase client not ready");
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('menu_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            // Map Supabase fields to App's expected format if names differ
            // Supabase: req_meat, is_tray, is_new, is_available
            // App: reqMeat, isTray, isNew

            window.menuItems = data.map(item => {
                // Check if image exists or use placeholder
                // Since this is client-side, we can't check file existence easily without fetch
                // But we can add an onerror handler to the img tags later in renderMenu
                // For now, let's just use what's in DB, but ensure it's not null
                return {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    icon: item.icon,
                    category: item.category,
                    reqMeat: item.req_meat,
                    isTray: item.is_tray,
                    isNew: item.is_new,
                    kcal: item.kcal,
                    kcal: item.kcal,
                    image: (item.image === 'images/kaprao-kai.jpg' || item.image === 'images/kaprao-pla-muek.jpg')
                        ? 'https://placehold.co/400x300?text=No+Image'
                        : (item.image || 'https://placehold.co/400x300?text=Kaprao52'), // Default Placeholder
                    desc: item.description,
                    available: item.is_available !== false // Default true
                };
            }).filter(item => item.available); // Show only available items

            console.log("Loaded " + window.menuItems.length + " items from Supabase");

            // Re-render menu if function exists
            if (typeof renderMenu === 'function') {
                renderMenu();
                // Add global error handler for images after render
                setTimeout(() => {
                    document.querySelectorAll('.menu-img').forEach(img => {
                        img.onerror = function () {
                            this.src = 'https://placehold.co/400x300?text=Kaprao52'; // Specific fallback
                            this.onerror = null; // Prevent infinite loop
                        };
                    });
                }, 500);
            }
        }
    } catch (err) {
        console.error("Failed to load menu from Cloud:", err);
        // Fallback to static menu is automatic because window.menuItems is already defined in menu.js
        // But we should probably overwrite menu.js content or load this script AFTER menu.js
    }
};

// Auto-load on start
document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure Supabase client is ready
    setTimeout(fetchMenuFromSupabase, 500);
});
