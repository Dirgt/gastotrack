const fs = require('fs');
const path = require('path');

const colorMap = {
  '#E27B7B': 'var(--danger-color)',
  '#d35959': 'var(--danger-color)',
  '#79A387': 'var(--success-color)',
  '#6bb97a': 'var(--success-color)',
  '#F6B896': 'var(--primary-color)',
  '#F2A47A': 'var(--primary-hover)',
  '#E8B86D': '#F59E0B',
  '#d4a24e': '#D97706',
  '#9b6cff': 'var(--primary-color)',
  '#FFDDC1': 'rgba(99, 102, 241, 0.1)', // Light indigo
  '#D27B53': 'var(--primary-color)',
  '#DDA381': 'var(--primary-color)',
  '#7209b7': 'var(--primary-hover)',
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./app', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const [oldColor, newColor] of Object.entries(colorMap)) {
      // Create a global case-insensitive regex for the hex color
      const regex = new RegExp(oldColor, 'gi');
      content = content.replace(regex, newColor);
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
});
