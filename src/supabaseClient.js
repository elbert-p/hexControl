// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cchjrnyzmqtibaeilxez.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjaGpybnl6bXF0aWJhZWlseGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NzgxNjAsImV4cCI6MjA1OTQ1NDE2MH0.BRjWrwwJyHjCgyMz3gKi81KRXhaEQgHTAlmzlWHjqmc";
export const supabase = createClient(supabaseUrl, supabaseKey);
