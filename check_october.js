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

async function checkAndClean() {
  const { data: allData, error: allErr } = await supabase.from('transactions').select('id, created_at, description, amount');
  if (allErr) {
    console.error("Fetch Error:", allErr);
    return;
  }
  
  const octData = allData.filter(t => t.created_at.includes('2026-10'));
  console.log("Found October transactions:", octData.length);
  
  if (octData.length > 0) {
    const ids = octData.map(t => t.id);
    const { data: delData, error: delErr } = await supabase.from('transactions').delete().in('id', ids);
    if (delErr) {
      console.error("Delete Error:", delErr);
    } else {
      console.log("Successfully deleted IDs:", ids);
    }
  }
}

checkAndClean();
