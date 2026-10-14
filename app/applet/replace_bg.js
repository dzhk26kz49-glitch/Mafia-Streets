const fs = require('fs');
const path = 'src/pages/Militias.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/bg-black\/20/g, 'bg-transparent');
content = content.replace(/bg-white\/5/g, 'bg-transparent');
fs.writeFileSync(path, content);
console.log('Replaced bg classes');
