const SUPABASE_URL =
"https://hrdtylxfkcsgyhghhptr.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZHR5bHhma2NzZ3loZ2hocHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODc3NzksImV4cCI6MjA5NTU2Mzc3OX0.DwnwVrOcYfTeiz18BJEvCipoeDUQ4t_dg3biuCtIe94";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
