import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { content } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) return res.status(500).json({ error: 'No API Key' });

    const ai = new GoogleGenAI({ apiKey });

    // Usando o modelo estável
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      config: {
          responseMimeType: "application/json"
      },
      contents: [
          {
              role: 'user',
              parts: [{
                  text: `Analise o seguinte conteúdo financeiro e extraia transações em JSON:\n${content}\n\nFormato esperado: Array de objetos { date, description, amount, type, category, paymentMethod }.`
              }]
          }
      ]
    });

    const responseText = result.text || "[]";
    
    return res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Falha ao processar arquivo' });
  }
}