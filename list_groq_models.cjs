const { Groq } = require("groq-sdk");
require('dotenv').config();
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function listModels() {
    try {
        const models = await groq.models.list();
        const ids = models.data.map(m => m.id);
        const filtered = ids.filter(id => id.toLowerCase().includes('vision') || id.toLowerCase().includes('llama'));
        fs.writeFileSync('groq_models_list.json', JSON.stringify(ids, null, 2));
        console.log('Filtered:', JSON.stringify(filtered, null, 2));
    } catch (err) {
        console.error('Error listing models:', err.message);
    }
}

listModels();
