const fs = require('fs');
const path = require('path');
const extractDir = path.join(__dirname, 'temp_docx_template_extract');
const docXml = fs.readFileSync(path.join(extractDir, 'word', 'document.xml'), 'utf8');

// Find all paragraphs and print their styles and text
const pMatches = docXml.match(/<w:p [^>]*>.*?<\/w:p>|<w:p>.*?<\/w:p>/gs) || [];
console.log(`Total paragraphs: ${pMatches.length}`);
pMatches.forEach((p, idx) => {
  const pStyleMatch = p.match(/<w:pStyle w:val="([^"]+)"/);
  const pStyle = pStyleMatch ? `[${pStyleMatch[1]}] ` : '';
  const tMatches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/gs) || [];
  const text = tMatches.map(t => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')).join('');
  if (text.trim()) {
    console.log(`P${idx+1}: ${pStyle}${text}`);
  }
});
