const fs = require('fs');

const docXml = fs.readFileSync('template_unpacked/word/document.xml', 'utf8');
const text = docXml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '');
console.log('--- FIRST 2000 CHARACTERS OF CURRENT DOCX ---');
console.log(text.substring(0, 2000));
console.log('--- SEARCHING FOR SYSTEM TERMS ---');
console.log('Contains Gastotrack?', text.includes('Gastotrack'));
console.log('Contains Numpad?', text.includes('Numpad'));
console.log('Contains Santi?', text.includes('Santi'));
console.log('Contains Supabase?', text.includes('Supabase'));
console.log('Contains MediKids/Mediatrack/Citas?', text.includes('Medi') || text.includes('cita') || text.includes('médic'));
