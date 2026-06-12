const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let c = fs.readFileSync(filePath, 'utf8');
    
    // single quotes
    c = c.replace(/'http:\/\/localhost:5000([^']*)'/g, '`${import.meta.env.VITE_API_URL}$1`');
    // template literals
    c = c.replace(/`http:\/\/localhost:5000([^`]*)`/g, '`${import.meta.env.VITE_API_URL}$1`');
    // raw JSX text
    c = c.replace(/>http:\/\/localhost:5000([^<]*)</g, '>{import.meta.env.VITE_API_URL}$1<');
    // ApiDocs path inject
    c = c.replace(/http:\/\/localhost:5000\{path\}/g, '{import.meta.env.VITE_API_URL}{path}');

    fs.writeFileSync(filePath, c);
});
console.log('done replacing');
