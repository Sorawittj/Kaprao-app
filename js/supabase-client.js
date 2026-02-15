
// Initialize Supabase Client (Global Scope)
// Ensure this script is loaded after the Supabase CDN script

// TODO: Replace with your actual Supabase Project params
const SUPABASE_URL = 'https://wlfvwjkdfvqlivvdkffk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZnZ3amtkZnZxbGl2dmRrZmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDgyNzUsImV4cCI6MjA4NjcyNDI3NX0.L4Ib5zjyL6pMVnAjJrcQxQLqqSdmT5HPLHH9Fdn_7MM';

// Check if suapbase is available
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase library not loaded. Please include the CDN script.');
}
