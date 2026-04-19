import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://iwaeusgoegaumxkqchma.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YWV1c2dvZWdhdW14a3FjaG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTI1NDEsImV4cCI6MjA5MTIyODU0MX0.4Q8EF8kxCX1Qv53tft67YVYv92VvZVwrHRUZP2zC-jE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
