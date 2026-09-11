const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) {
    env[key.trim()] = rest.join('=').trim().replace(/\r/g, '');
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function testFetch() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log("LAST 20 TRANSACTIONS:", data);
}
testFetch();
