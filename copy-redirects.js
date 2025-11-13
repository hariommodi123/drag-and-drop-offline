const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'public', '_redirects');
const dest = path.join(__dirname, 'build', '_redirects');

if (fs.existsSync(source)) {
  // Ensure build directory exists
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  fs.copyFileSync(source, dest);
  console.log('✅ _redirects file copied to build folder');
} else {
  console.log('⚠️  _redirects file not found in public folder');
}

