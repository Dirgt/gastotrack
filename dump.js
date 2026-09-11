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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function dump() {
  const { data, error } = await supabase.from('transactions').select('*');
  if (error) {
    console.error(error);
  } else {
    fs.writeFileSync('dump.json', JSON.stringify(data, null, 2));
    console.log(`Dumped ${data.length} transactions`);
  }
}
dump();
