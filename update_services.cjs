const fs = require('fs');
const path = require('path');

const dir = 'd:/diego/Documentos/Antigravity/EBM/src/services';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'apiClient.ts' && f !== 'storageService.ts');

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Inject import if not already present
    if (!content.includes("import { apiClient }")) {
        const importMatch = content.match(/^import .*?;\r?\n/m);
        if (importMatch) {
            content = content.replace(importMatch[0], importMatch[0] + "import { apiClient } from './apiClient';\r\n");
        } else {
            content = "import { apiClient } from './apiClient';\r\n" + content;
        }
    }

    // Replace standalone fetch(
    // We match \bfetch( or fetch(` or similar safely
    content = content.replace(/\bfetch\(/g, 'apiClient(');

    fs.writeFileSync(filePath, content, 'utf-8');
});
console.log('Updated services successfully');
