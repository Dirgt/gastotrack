const fs = require('fs');
const path = require('path');

const gradientMap = {
  'linear-gradient(90deg, var(--primary-color), var(--primary-color))': 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
  'linear-gradient(135deg, var(--primary-color), var(--primary-color))': 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
  'linear-gradient(45deg, var(--primary-color), var(--primary-hover))': 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
  'linear-gradient(90deg, var(--success-color), var(--success-color))': 'linear-gradient(135deg, var(--success-color), #059669)',
  'linear-gradient(135deg, var(--success-color), var(--success-color))': 'linear-gradient(135deg, var(--success-color), #059669)',
  'linear-gradient(90deg, var(--danger-color), var(--danger-color))': 'linear-gradient(135deg, var(--danger-color), #E11D48)',
  '-webkit-linear-gradient(45deg, var(--primary-color), var(--primary-hover))': 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))'
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
    
    for (const [oldGrad, newGrad] of Object.entries(gradientMap)) {
      content = content.split(oldGrad).join(newGrad);
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed Gradients:', filePath);
    }
  }
});
