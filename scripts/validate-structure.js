/**
 * Structure Validation Script
 * Checks that all required files exist
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'index.html',
  'manifest.json',
  'sw.v2.js',
  'offline.html',
  'js/config.js',
  'js/state.js',
  'js/core/StateManager.js',
  'js/core/IdempotentRequest.js',
  'js/core/ErrorBoundary.js',
  'js/auth/AuthManager.js',
  'js/ui/SkeletonLoader.js',
  'js/ui/ToastQueue.js'
];

let hasErrors = false;

console.log('Validating project structure...\n');

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file}`);
  } else {
    console.error(`✗ Missing: ${file}`);
    hasErrors = true;
  }
});

console.log('');

if (hasErrors) {
  console.error('Validation failed!');
  process.exit(1);
} else {
  console.log('✓ Project structure is valid');
  process.exit(0);
}
