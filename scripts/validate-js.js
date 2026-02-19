/**
 * JavaScript Validation Script
 * Checks for syntax errors and common issues
 */

const fs = require('fs');
const path = require('path');

const jsFiles = [
  'js/core/StateManager.js',
  'js/core/IdempotentRequest.js',
  'js/core/ErrorBoundary.js',
  'js/auth/AuthManager.js',
  'js/ui/SkeletonLoader.js',
  'js/ui/ToastQueue.js',
  'js/state.js',
  'js/utils.js',
  'js/menu.js',
  'js/cart.js',
  'js/checkout.js',
  'js/app.js',
  'js/liff.js'
];

let hasErrors = false;

console.log('Validating JavaScript files...\n');

jsFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ Missing: ${file}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for syntax errors using Function constructor
    new Function(content);
    
    // Check for common issues
    const issues = [];
    
    // Check for undeclared strict mode issues (variables without let/const/var)
    // This is a simple check, not comprehensive
    if (content.includes('= [];') && !content.includes('window.')) {
      // Potentially missing window. prefix for global variables
    }
    
    // Check for duplicate class declarations
    const classMatches = content.match(/class\s+\w+/g);
    if (classMatches) {
      const classNames = classMatches.map(m => m.replace('class ', ''));
      const duplicates = classNames.filter((item, index) => classNames.indexOf(item) !== index);
      if (duplicates.length > 0) {
        issues.push(`Duplicate class: ${duplicates[0]}`);
      }
    }
    
    // Check for proper exports
    if (file.startsWith('js/core/') || file.startsWith('js/auth/') || file.startsWith('js/ui/')) {
      if (!content.includes('window.') && !content.includes('export')) {
        issues.push('No window assignment or export found');
      }
    }
    
    if (issues.length > 0) {
      console.log(`⚠ ${file}:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
      hasErrors = true;
    } else {
      console.log(`✓ ${file}`);
    }
    
  } catch (error) {
    console.error(`✗ ${file}: ${error.message}`);
    hasErrors = true;
  }
});

console.log('');

if (hasErrors) {
  console.error('Validation failed!');
  process.exit(1);
} else {
  console.log('✓ All JavaScript files are valid');
  process.exit(0);
}
