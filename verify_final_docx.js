const fs = require('fs');

const docXml = fs.readFileSync('template_unpacked/word/document.xml', 'utf8');
const text = docXml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '');
console.log('--- VERIFICATION RESULTS ---');
console.log('Total document text length:', text.length);
console.log('Contains Gastotrack?', text.includes('Gastotrack'));
console.log('Contains Santiago & Equipo?', text.includes('Santiago'));
console.log('Contains Modo Pareja (Santi y Kate)?', text.includes('Santi') && text.includes('Kate'));
console.log('Contains NumpadForm?', text.includes('NumpadForm'));
console.log('Contains Supabase Storage?', text.includes('Supabase Storage'));
console.log('Contains 48.515.500 COP?', text.includes('48.515.500'));
console.log('Contains 08/09/2026 to 20/10/2026?', text.includes('08/09/2026') && text.includes('20/10/2026'));
console.log('Contains any old medical data (citas en salud / Alexandra)?', text.includes('citas en salud') || text.includes('Alexandra'));
console.log('Contains any LaTeX syntax ($)?', text.includes('$') && (text.includes('\\text') || text.includes('\\frac') || text.includes('\\sum') || text.includes('\\ge')));
