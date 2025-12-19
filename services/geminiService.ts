import { Transaction, UserProfile, ChatMessage } from "../types";
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import * as XLSX from 'xlsx';

// --- HELPER: CONVERTE ARQUIVO PARA BASE64 ---
// Isso é crucial para a Groq conseguir ler imagens e PDFs
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o cabeçalho "data:image/png;base64," para enviar apenas os dados
      const base64 = result.split(',')[1]; 
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// --- EXTRAÇÃO DE TEXTO LOCAL (Para Word/Excel/TXT) ---
export const processAttachment = async (file: File): Promise<string> => {
    const mimeType = file.type;
    
    if (mimeType === 'text/plain' || mimeType === 'text/csv' || file.name.endsWith('.csv')) {
        return await file.text();
    }

    if (file.name.endsWith('.docx')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (e) {
            return "Erro ao ler DOCX";
        }
    }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            let allText = '';
            workbook.SheetNames.forEach((sheetName: string) => {
                const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                allText += `Planilha ${sheetName}:\n${csv}\n`;
            });
            return allText;
        } catch (e) {
            return "Erro ao ler Excel";
        }
    }
    
    return ""; // PDF e Imagens retornam vazio aqui pois vão via 'fileData'
};

// --- LEITOR DE EXTRATO (Conecta com /api/parse) ---
export const parseBankStatement = async (file: File): Promise<Transaction[]> => {
  try {
    let payload: any = {};

    // Se for Imagem ou PDF, enviamos o Base64 para a API
    if (file.type.includes('image') || file.type === 'application/pdf') {
        const base64 = await fileToBase64(file);
        payload = {
            mimeType: file.type,
            fileData: base64 
        };
    } else {
        // Se for texto/excel, enviamos o texto extraído
        const content = await processAttachment(file);
        payload = {
            text: content
        };
    }
    
    const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro na API de processamento');
    }
    return await response.json();

  } catch (error) {
    console.error("Erro ao processar:", error);
    throw error;
  }
};

// --- CHAT CONTEXT ---
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

// --- CHAT FACTORY (Conecta com /api/chat) ---
export const createFinancialChat = (transactions: Transaction[], userProfile: UserProfile | null) => {
    const context = createTransactionContext(transactions, userProfile);
    
    return {
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

            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.error || 'Erro na API do Chat');
            }
            return await response.json();
        }
    };
};

export const generateFinancialAdvice = async (transactions: Transaction[], userProfile: UserProfile | null) => {
    // Placeholder simples para evitar quebras
    return {
        summary: "Funcionalidade em manutenção para migração de IA.",
        spendingAnalysis: "Tente novamente em breve.",
        tips: ["Mantenha o controle dos gastos."]
    };
};