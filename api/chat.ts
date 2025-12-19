import OpenAI from "openai";

export default async function handler(req, res) {
  // Configuração CORS
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
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' });

    // Conecta na Groq usando a lib da OpenAI
    const groq = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    // Prepara o histórico
    // A Groq/OpenAI aceita uma lista simples de mensagens { role, content }
    const messages = [
        { 
            role: "system", 
            content: `Você é o Fin, assistente financeiro pessoal. 
                      CONTEXTO DO USUÁRIO: ${userContext || 'Nenhum'}. 
                      Responda de forma direta, breve e use emojis.` 
        },
        ...(history || []).map((msg: any) => ({
            role: msg.role === 'model' ? 'assistant' : 'user', // Groq usa 'assistant', não 'model'
            content: msg.text || ""
        })),
        { role: "user", content: message || "Analisar" }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile", // Modelo muito rápido e inteligente
      temperature: 0.5,
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content || "";

    return res.status(200).json({
        text,
        functionCalls: [],
        sources: []
    });

  } catch (error: any) {
    console.error("Erro Groq Chat:", error);
    return res.status(500).json({ error: error.message || 'Erro interno na Groq' });
  }
}