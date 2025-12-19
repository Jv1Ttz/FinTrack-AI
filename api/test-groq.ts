import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    // 1. Verifica se a chave existe no ambiente
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("A chave GROQ_API_KEY não foi encontrada no .env.local");
    }

    // 2. Tenta iniciar a biblioteca
    const groq = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    // 3. Tenta uma conexão real
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Responda apenas: CONEXÃO OK" }],
      model: "llama-3.3-70b-versatile",
    });

    return res.status(200).json({
      status: "SUCESSO",
      message: "Seu servidor falou com a Groq e ela respondeu!",
      resposta_groq: completion.choices[0]?.message?.content
    });

  } catch (error: any) {
    return res.status(500).json({
      status: "FALHA LOCAL",
      motivo: error.message,
      dica: error.message.includes("Module not found") 
            ? "Você esqueceu de rodar 'npm install openai'" 
            : "Verifique sua chave e reinicie o servidor."
    });
  }
}