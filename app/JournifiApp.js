let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      'https://wldkrgiojrustsmgzitk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZGtyZ2lvanJ1c3RzbWd6aXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDgxODQsImV4cCI6MjA5ODA4NDE4NH0.mwMfdEIaK9-caleD-N24QhMAiC-W41WoFTUXC8fZh_0'
    );
  }
  return _supabase;
}
