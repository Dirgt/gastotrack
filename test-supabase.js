const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const currentMonth = new Date('2026-09-11T20:00:00-05:00');
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, type, description, created_at, is_paid, paid_at, receipt_url, is_installment, installment_current, installment_total, categories(name, icon, parent:parent_id(name, icon))')
    .eq('user_id', '5c4a09e9-0cd8-49c1-be28-76bc1380b6d0')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .order('created_at', { ascending: false });

  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Data length:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('First item:', JSON.stringify(data[0], null, 2));
  }
}

run();
