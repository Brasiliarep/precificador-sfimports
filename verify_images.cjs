const fs = require('fs');
const path = require('path');

const TABLE_FILE = path.join(__dirname, 'data', 'tabela_completa.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

try {
    const data = JSON.parse(fs.readFileSync(TABLE_FILE, 'utf8'));
    let missing = 0;
    let total = data.length;

    data.forEach((item, index) => {
        if (item.image) {
            // Remove query string if present
            const cleanPath = item.image.split('?')[0];
            const absolutePath = path.join(PUBLIC_DIR, cleanPath);

            if (!fs.existsSync(absolutePath)) {
                console.log(`[MISSING] Row ${index} (${item.supplierName}): ${item.image}`);
                missing++;
            }
        }
    });

    console.log(`\nVerification Summary:`);
    console.log(`Total items: ${total}`);
    console.log(`Missing images: ${missing}`);
} catch (err) {
    console.error('Error running verification:', err);
}
