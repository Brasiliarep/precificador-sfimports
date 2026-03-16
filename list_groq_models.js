const { Groq } = require("groq-sdk");
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function listModels() {
    try {
        const models = await groq.models.list();
        // Filtra apenas modelos de visão se possível, ou mostra tudo
        const ids = models.data.map(m => m.id);
        console.log(JSON.stringify(ids, null, 2));
    } catch (err) {
        console.error('Error listing models:', err.message);
    }
}

listModels();
