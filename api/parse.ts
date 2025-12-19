import OpenAI from "openai";

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
    const { text, fileData, mimeType } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY ausente' });

    const groq = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    // Prompt de Sistema para forçar JSON
    const systemPrompt = `
      Você é um especialista em extração de dados financeiros (OCR).
      Sua tarefa é analisar o documento e retornar APENAS um JSON válido.
      
      FORMATO OBRIGATÓRIO (Array de Objetos):
      [
        {
          "date": "YYYY-MM-DD",
          "description": "Descrição curta",
          "amount": 0.00,
          "type": "INCOME" ou "EXPENSE",
          "category": "Categoria sugerida",
          "paymentMethod": "CREDIT_CARD", "DEBIT_CARD", "PIX" ou "CASH"
        }
      ]
      
      IMPORTANTE:
      - Não use markdown (\`\`\`json).
      - Retorne apenas o JSON puro.
      - Se não encontrar nada, retorne [].
    `;

    let userMessageContent: any[] = [];

    // Se tiver arquivo (Imagem/PDF)
    if (fileData && mimeType) {
        // A Groq espera o formato Data URL
        const dataUrl = `data:${mimeType};base64,${fileData}`;
        userMessageContent.push({
            type: "image_url",
            image_url: {
                url: dataUrl
            }
        });
        userMessageContent.push({ type: "text", text: "Extraia as transações desta imagem." });
    } else {
        // Se for só texto
        userMessageContent.push({ type: "text", text: `TEXTO DO EXTRATO:\n${text}` });
    }

    // Escolhe o modelo: Vision para imagens, Versatile para texto
    const model = (fileData) ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessageContent as any }
      ],
      model: model,
      temperature: 0.1, // Baixa temperatura para ser mais preciso no JSON
    });

    let finalText = completion.choices[0]?.message?.content || "[]";

    // Limpeza de segurança para garantir JSON puro
    finalText = finalText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Tenta extrair o array se vier texto extra
    const firstBracket = finalText.indexOf('[');
    const lastBracket = finalText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        finalText = finalText.substring(firstBracket, lastBracket + 1);
    }

    return res.status(200).json(JSON.parse(finalText));

  } catch (error: any) {
    console.error("Erro Groq Parse:", error);
    return res.status(500).json({ error: `Erro na Groq: ${error.message}` });
  }
}