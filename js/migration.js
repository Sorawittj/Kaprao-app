
// =============================================
// Migration Logic: Restore legacy points (Google Sheets -> Supabase)
// =============================================

window.checkAndMigrateLegacyData = async function (user) {
    if (!window.supabaseClient || !user) return;

    // 1. Identify LINE User ID
    // Supabase Auth with LINE provider stores the Line User ID in 'identities'
    const identities = user.identities || [];
    const lineIdentity = identities.find(id => id.provider === 'line');

    if (!lineIdentity) {
        // Not logged in with LINE, or no identity data found. 
        // Cannot migrate legacy data which is keyed by LINE ID.
        return;
    }

    const lineUserId = lineIdentity.id_in_provider || lineIdentity.id;
    // Usually 'id' in identity object matches provider's ID for OAuth.

    console.log("Checking legacy data for:", lineUserId);

    try {
        // 2. Check if this user has legacy data waiting
        const { data: legacyRecord, error } = await window.supabaseClient
            .from('legacy_members')
            .select('*')
            .eq('line_user_id', lineUserId)
            .maybeSingle();

        if (error) throw error;

        if (legacyRecord) {
            console.log("Found legacy data:", legacyRecord);

            // 3. Execute Migration (Server-side function)
            const { error: rpcError } = await window.supabaseClient.rpc('migrate_legacy_points', {
                uid: user.id,
                l_points: legacyRecord.points || 0,
                l_orders: legacyRecord.total_orders || 0
            });

            if (rpcError) throw rpcError;

            // 4. Delete legacy record to prevent double claiming
            await window.supabaseClient
                .from('legacy_members')
                .delete()
                .eq('line_user_id', lineUserId);

            // 5. Notify User
            showToast(`🎉 ยินดีต้อนรับกลับ! กู้คืน ${legacyRecord.points} แต้มเรียบร้อย`, 'success');

            // 6. Refresh Local Data
            if (typeof loadUserHistory === 'function') loadUserHistory();

        } else {
            console.log("No legacy data found.");
        }
    } catch (err) {
        console.error("Migration Failed:", err);
    }
};
