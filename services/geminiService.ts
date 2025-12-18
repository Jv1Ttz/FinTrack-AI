import { Transaction, UserProfile, ChatMessage } from "../types";
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import * as XLSX from 'xlsx';

// --- ADICIONEI ESTA EXPORTAÇÃO QUE FALTAVA ---
export interface FinancialAdvice {
  summary: string;
  spendingAnalysis: string;
  tips: string[];
}

// --- PROCESSAMENTO DE ARQUIVOS (LOCAL) ---
export const processAttachment = async (file: File): Promise<string> => {
    const mimeType = file.type;
    
    if (mimeType === 'text/plain' || mimeType === 'text/csv' || file.name.endsWith('.csv')) {
        return await file.text();
    }

    if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        let allText = '';
        workbook.SheetNames.forEach((sheetName: string) => {
            const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
            allText += `Planilha ${sheetName}:\n${csv}\n`;
        });
        return allText;
    }
    
    return "Arquivo binário (Imagem/PDF/Audio) - Envio direto para API.";
};

// --- CHAMADA PARA API DE PARSE ---
export const parseBankStatement = async (file: File): Promise<Transaction[]> => {
  try {
    const content = await processAttachment(file);
    
    const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            content: `Nome do Arquivo: ${file.name}\nConteúdo (se for texto):\n${content}` 
        })
    });

    if (!response.ok) throw new Error('Erro na API de processamento');
    return await response.json();

  } catch (error) {
    console.error("Erro ao processar:", error);
    throw error;
  }
};

export const generateFinancialAdvice = async (transactions: Transaction[], userProfile: UserProfile | null) => {
    const context = createTransactionContext(transactions, userProfile);
    const prompt = "Gere um relatório financeiro JSON com: summary, spendingAnalysis e tips.";
    
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: prompt,
            history: [],
            userContext: context
        })
    });

    const data = await response.json();
    try {
        // Se a API devolver JSON string no campo text
        return JSON.parse(data.text); 
    } catch {
        // Fallback
        return {
            summary: "Análise realizada.",
            spendingAnalysis: data.text,
            tips: ["Verifique seus gastos."]
        };
    }
};

// --- CHAT SERVICE ---
const createTransactionContext = (transactions: Transaction[], userProfile: UserProfile | null): string => {
  const transactionSummary = transactions.slice(0, 50).map(t => 
    `[ID:${t.id}] ${t.date}: ${t.description} (${t.category}) ${t.type} R$${t.amount}`
  ).join('\n');

  let context = `DADOS:\n${transactionSummary}\n`;
  if (userProfile) {
    context += `PERFIL: Salário R$${userProfile.monthlySalary}, Meta: ${userProfile.financialGoals}`;
  }
  return context;
}

export const createFinancialChat = (transactions: Transaction[], userProfile: UserProfile | null) => {
    const context = createTransactionContext(transactions, userProfile);
    
    return {
        // Função customizada que simula o SDK mas chama nossa API
        sendMessage: async (message: string | any, history: ChatMessage[]) => {
            const textContent = typeof message === 'string' ? message : (message[0] || "Analisar arquivo");
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textContent,
                    history: history.filter(h => h.role !== 'model' || h.text), 
                    userContext: context
                })
            });

            if (!response.ok) throw new Error('Erro na API do Chat');
            return await response.json();
        }
    };
};