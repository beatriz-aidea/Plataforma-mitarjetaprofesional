const fs = require('fs');
const path = './src/pages/EditCard.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\[#c8102e\]/g, 'brand-600');
fs.writeFileSync(path, content);
console.log('Done');
