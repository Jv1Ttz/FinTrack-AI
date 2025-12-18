import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  // 1. Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { message, history, userContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured on server' });
    }

    // 2. Limpeza da mensagem
    let finalMessage = "Analisar";
    if (message && typeof message === 'string' && message.trim().length > 0) {
        finalMessage = message.trim();
    } else if (typeof message === 'object') {
        finalMessage = JSON.stringify(message);
    }

    // 3. Limpeza do Histórico
    const validHistory = (history || [])
        .filter((msg: any) => msg.text && msg.text.trim() !== '')
        .map((msg: any) => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

    const ai = new GoogleGenAI({ apiKey });

    // 4. Iniciar o Chat com o modelo estável
    const chat = ai.chats.create({
        model: 'gemini-1.5-flash', // Versão estável e rápida
        config: {
            tools: [
                { googleSearch: {} },
                {
                    functionDeclarations: [
                        {
                            name: 'addTransaction',
                            description: 'Adiciona uma nova transação financeira.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    description: { type: Type.STRING },
                                    amount: { type: Type.NUMBER },
                                    type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                                    date: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    paymentMethod: { type: Type.STRING },
                                    installmentCount: { type: Type.INTEGER }
                                },
                                required: ['description', 'amount', 'type', 'date', 'category']
                            }
                        },
                        {
                            name: 'deleteTransaction',
                            description: 'Exclui uma transação pelo ID.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: { id: { type: Type.STRING } },
                                required: ['id']
                            }
                        },
                        {
                            name: 'editTransaction',
                            description: 'Edita uma transação existente.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    amount: { type: Type.NUMBER },
                                    date: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    type: { type: Type.STRING },
                                    paymentMethod: { type: Type.STRING }
                                },
                                required: ['id']
                            }
                        }
                    ]
                }
            ],
            systemInstruction: `
            Você é o Fin, assistente financeiro pessoal.
            CONTEXTO DO USUÁRIO:
            ${userContext || "Não informado"}
            
            Diretrizes:
            1. Seja amigável, breve e use emojis 🤖.
            2. Se o usuário pedir para salvar/gastar, USE AS FERRAMENTAS.
            3. Responda sempre em Português do Brasil.
            `
        },
        history: validHistory
    });

    // 5. Enviar mensagem (Sintaxe correta do novo SDK)
    const result = await chat.sendMessage({
        message: finalMessage
    });
    
    // 6. Pegar resposta com segurança
    const text = result.text || ""; 
    
    // @ts-ignore
    const functionCalls = result.functionCalls || [];
    
    let sources: any[] = [];
    if (result.candidates && result.candidates[0]?.groundingMetadata?.groundingChunks) {
         sources = result.candidates[0].groundingMetadata.groundingChunks
            .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
            .filter(Boolean);
    }

    return res.status(200).json({
        text,
        functionCalls,
        sources
    });

  } catch (error: any) {
    console.error("API Error Detalhado:", error);
    
    // Tratamento amigável para limite de cota
    if (error.message && error.message.includes('429')) {
        return res.status(429).json({ 
            text: "😅 Estou recebendo muitas mensagens agora! Espere 1 minutinho e tente de novo, por favorr." 
        });
    }

    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}