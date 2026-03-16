import { GoogleGenAI, Type } from "@google/genai";
import { SupplierProduct, StoreProduct } from "../types";

// Blacklist de termos indesejados (Comidas, não alcoólicos, etc.)
const BLACKLIST = [
  "QUEIJO", "SUCO", "GELÉIA", "GELEIA", "MOLHO", 
  "SALAME", "REFRIGERANTE", "ÁGUA", "AGUA", "ICE", 
  "CERVEJA", "ENERGÉTICO", "BOMBOM", "CHOCOLATE", 
  "BATATA", "AMENDOIM", "TORRADA", "BISCOITO", 
  "AZEITE", "VINAGRE", "CONSERVA", "COPO", "TAÇA"
];

const repairTruncatedJSON = (text: string): any => {
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // 1. Tenta parsear direto
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Falhou, provavel truncamento. Vamos tentar reparar.
  }

  // 2. Encontra o início do objeto
  const firstBracket = cleaned.indexOf('{');
  if (firstBracket === -1) return null;

  // 3. Estratégia de Reparo para { "items": [ ...
  // O corte geralmente acontece no meio de um item ou após uma vírgula.
  // Vamos buscar o último fechamento de objeto '}' seguro.
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (lastBrace !== -1 && lastBrace > firstBracket) {
      // Pega tudo até o último fechamento de objeto
      const candidate = cleaned.substring(firstBracket, lastBrace + 1);
      
      // Tenta fechar array e objeto root: ]}
      try {
          return JSON.parse(candidate + ']}');
      } catch (e1) {
          // Se falhar, talvez fosse apenas o fechamento do root que faltava?
          try {
              return JSON.parse(candidate + '}');
          } catch (e2) {
              // Última tentativa: talvez o JSON esteja válido até ali mas faltou fechar ]}
              // (Muitas vezes o modelo corta ex: ... {"a":1}, {"b":2 )
          }
      }
  }

  console.warn("JSON Repair Failed. Data chunk lost.");
  return null;
};

const chunkText = (text: string, linesPerChunk: number = 40): string[] => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    chunks.push(lines.slice(i, i + linesPerChunk).join('\n'));
  }
  return chunks;
};

// Helper: Retry logic for API calls
// REDUCED RETRIES TO 1 TO SAVE QUOTA
const generateWithRetry = async (ai: GoogleGenAI, params: any, retries = 1) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (e: any) {
      console.warn(`Attempt ${i + 1} failed:`, e.message);
      if (i === retries - 1 || e.message?.includes('API key') || e.message?.includes('403')) {
        throw e;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error("Failed to call Gemini API");
};

export const parseStoreCatalog = async (text: string): Promise<StoreProduct[]> => {
    if (!process.env.API_KEY) throw new Error("API Key is missing in environment variables.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    if (!text || text.trim().length === 0) return [];

    const parts = [
        { text: "Extract Product ID, Name and Current Price from this store export." },
        { text: text.slice(0, 30000) }, 
        { text: "Return JSON array: [{ id: 'string', name: 'string', price: number }]. If no ID found, generate one." }
    ];

    try {
        const response = await generateWithRetry(ai, {
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        products: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    name: { type: Type.STRING },
                                    price: { type: Type.NUMBER }
                                }
                            }
                        }
                    }
                }
            }
        });
        const res = repairTruncatedJSON(response.text || "{}");
        return res?.products || [];
    } catch (e) {
        console.error("Error parsing store catalog", e);
        throw e;
    }
};

export const extractSupplierData = async (
  supplierText: string,
  onProgress?: (current: number, total: number) => void
): Promise<SupplierProduct[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing in environment variables.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (!supplierText || supplierText.trim().length === 0) return [];

  // CRITICAL FIX: Batch size reduced to 150 to prevent JSON truncation
  const chunks = chunkText(supplierText, 150);
  let allItems: SupplierProduct[] = [];

  console.log(`Extracting Supplier Data in ${chunks.length} batches (Optimized)...`);

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);

    const systemInstruction = `
      You are a FORENSIC PRICING DATA EXTRACTOR. 
      Your goal is to parse "Dirty Supplier Data" from a wine supplier PDF/Excel paste into structured JSON.
      
      RULES:
      1. IGNORE formatting. Read RAW TEXT.
      2. DETECT "STUCK PRICES": "120,0099,00" -> 99.00 (Cost) and 120.00 (List).
      3. ALWAYS assume LOWER number is 'detectedCost'. HIGHER is 'detectedListPrice'.
      4. If only ONE price ("55,00"), then Cost=55.00 AND List=55.00.
      5. Output BRAZILIAN FORMAT (1.000,00 = 1000.00).
      6. OUTPUT JSON: { items: [ { rawName, detectedCost, detectedListPrice } ] }
    `;

    try {
      const response = await generateWithRetry(ai, {
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: chunks[i] }] },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rawName: { type: Type.STRING },
                    detectedCost: { type: Type.NUMBER },
                    detectedListPrice: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      });
      
      // Use Robust Repair
      const res = repairTruncatedJSON(response.text || "{}");
      
      if (res?.items) {
          allItems = [...allItems, ...res.items];
      } else {
          console.warn(`Batch ${i+1} returned invalid/empty JSON even after repair.`);
      }
      
      // CRITICAL FIX: 5000ms delay to respect RPM/TPM limits and allow quota recovery
      if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 5000));
      }

    } catch (e) {
      console.error(`Batch ${i+1} failed completely`, e);
      // We do NOT throw here. We skip the bad batch and continue to salvage the rest.
    }
  }

  // --- BLACKLIST FILTER ---
  const cleanList = allItems.filter(item => {
    const upperName = item.rawName.toUpperCase();
    return !BLACKLIST.some(banned => upperName.includes(banned));
  });

  console.log(`Extraction complete. Raw: ${allItems.length}, Clean: ${cleanList.length}`);
  return cleanList;
};