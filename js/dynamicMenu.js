
// =============================================
// MENU LOADER: Supabase -> Local (with fallback)
// =============================================
// Merges Supabase menu data with local menu.js data
// Local data is the source of truth for reqMeat, isTray, etc.

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
            // Build a lookup map from local menu data (source of truth for reqMeat, isTray, etc.)
            // window.menuItems is defined in js/data/menu.js
            const localMenuMap = {};
            if (window.menuItems && Array.isArray(window.menuItems)) {
                window.menuItems.forEach(item => {
                    localMenuMap[item.id] = item;
                });
            }

            // Map Supabase fields to App's expected format
            // Supabase: req_meat, is_tray, is_new, is_available
            // App: reqMeat, isTray, isNew, soldOut
            const supabaseItems = data.map(item => {
                const localItem = localMenuMap[item.id] || {};

                return {
                    id: item.id,
                    name: item.name || localItem.name,
                    price: item.price || localItem.price,
                    icon: item.icon || localItem.icon || '🍱',
                    category: item.category || localItem.category,
                    // CRITICAL: Use Supabase req_meat if available, fallback to local reqMeat
                    reqMeat: (item.req_meat !== undefined && item.req_meat !== null)
                        ? item.req_meat
                        : (localItem.reqMeat || false),
                    // CRITICAL: Use Supabase is_tray if available, fallback to local isTray
                    isTray: (item.is_tray !== undefined && item.is_tray !== null)
                        ? item.is_tray
                        : (localItem.isTray || false),
                    trayType: item.tray_type || localItem.trayType || null,
                    isNew: (item.is_new !== undefined && item.is_new !== null)
                        ? item.is_new
                        : (localItem.isNew || false),
                    // soldOut: true means item is unavailable
                    soldOut: item.is_available === false,
                    kcal: item.kcal || localItem.kcal || 0,
                    image: item.image || localItem.image || 'images/logo.png',
                    desc: item.description || localItem.desc || '',
                    description: item.description || localItem.desc || ''
                };
            });

            // Also include local items that are NOT in Supabase (in case Supabase is missing some)
            const supabaseIds = new Set(supabaseItems.map(i => i.id));
            const localOnlyItems = (window.menuItems || []).filter(i => !supabaseIds.has(i.id));

            // Merge: Supabase items first, then local-only items
            window.menuItems = [...supabaseItems, ...localOnlyItems];

            console.log(`Menu loaded: ${supabaseItems.length} from Supabase + ${localOnlyItems.length} local-only = ${window.menuItems.length} total`);

            // Re-render menu if function exists
            if (typeof renderMenu === 'function') {
                renderMenu();
            }
        } else {
            console.log("No menu items in Supabase, using local menu data");
            // Keep existing window.menuItems from js/data/menu.js
        }
    } catch (err) {
        console.error("Failed to load menu from Supabase:", err);
        // Fallback to static menu is automatic because window.menuItems is already defined in data/menu.js
        console.log("Using local menu data as fallback");
    }
};

// Auto-load on start
document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure Supabase client is ready
    setTimeout(() => {
        fetchMenuFromSupabase();
        setupMenuRealtime();
    }, 800);
});

function setupMenuRealtime() {
    if (window.menuRealtimeSubscription) return; // Prevent multiple subscriptions
    if (!window.supabaseClient) return;

    window.menuRealtimeSubscription = window.supabaseClient
        .channel('menu_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
            console.log('Menu Realtime Update:', payload);

            if (payload.eventType === 'UPDATE') {
                const newItem = payload.new;
                const index = window.menuItems.findIndex(i => i.id === newItem.id);

                if (index !== -1) {
                    // Update existing item in place
                    const oldItem = window.menuItems[index];

                    // Create updated object
                    const updatedItem = {
                        ...oldItem,
                        name: newItem.name !== undefined ? newItem.name : oldItem.name,
                        price: newItem.price !== undefined ? newItem.price : oldItem.price,
                        category: newItem.category !== undefined ? newItem.category : oldItem.category,
                        // Helper: allow nulls if DB allows, but usually fallback to old
                        soldOut: newItem.is_available === false, // Critical Mapping
                        isNew: newItem.is_new !== undefined ? newItem.is_new : oldItem.isNew,
                        isTray: newItem.is_tray !== undefined ? newItem.is_tray : oldItem.isTray, // Ensure tray update
                        reqMeat: newItem.req_meat !== undefined ? newItem.req_meat : oldItem.reqMeat,
                        desc: newItem.description !== undefined ? newItem.description : oldItem.desc
                    };

                    window.menuItems[index] = updatedItem;

                    // Re-render
                    if (typeof renderMenu === 'function') {
                        renderMenu();
                        // Optional: Show toast if an item in view changed status
                        // showToast(`เมนู ${updatedItem.name} มีการอัปเดต`, 'info'); 
                    }
                } else {
                    // Item updated but not in local list? Fetch all to be safe
                    fetchMenuFromSupabase();
                }
            } else {
                // INSERT or DELETE
                fetchMenuFromSupabase();
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Listening for menu updates...');
            }
        });
}
