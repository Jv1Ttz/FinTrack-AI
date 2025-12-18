import React, { useState, useRef, useEffect } from 'react';
import { Transaction, UserProfile, ChatMessage } from '../types';
import { generateFinancialAdvice, FinancialAdvice, createFinancialChat, processAttachment } from '../services/geminiService';
import { Sparkles, BrainCircuit, Lightbulb, TrendingUp, AlertCircle, Loader2, Settings, Bot, Send, ExternalLink, Paperclip, X, FileText, Image as ImageIcon, Mic, FileSpreadsheet, FileType, StopCircle } from 'lucide-react';
// Removemos importações diretas do GoogleGenAI pois o service lida com isso
// import { Chat, GenerateContentResponse, FunctionCall } from "@google/genai"; 

interface AIReportProps {
  transactions: Transaction[];
  userProfile: UserProfile | null;
  onOpenProfile: () => void;
  onAddTransaction?: (transaction: Transaction | Transaction[]) => void;
  onDeleteTransaction?: (id: string) => void;
  onEditTransaction?: (id: string, updates: Partial<Transaction>) => void;
  
  // Persisted Chat State Props
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatInstance: any; // Usamos any aqui pois é nosso wrapper customizado do service
  setChatInstance: React.Dispatch<React.SetStateAction<any>>;
}

interface Source {
    title: string;
    uri: string;
}

const AIReport: React.FC<AIReportProps> = ({ 
    transactions, 
    userProfile, 
    onOpenProfile, 
    onAddTransaction, 
    onDeleteTransaction, 
    onEditTransaction,
    messages,
    setMessages,
    chatInstance,
    setChatInstance
}) => {
  // Report State
  const [advice, setAdvice] = useState<FinancialAdvice | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Local Chat UI State
  const [inputText, setInputText] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat ONLY if it doesn't exist yet
  useEffect(() => {
    if (transactions.length > 0 && !chatInstance) {
        try {
            const chat = createFinancialChat(transactions, userProfile);
            setChatInstance(chat);
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    }
  }, [transactions, userProfile, chatInstance, setChatInstance]);

  // Auto-scroll chat on mount and updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatTyping]);

  const handleGenerateReport = async () => {
    if (transactions.length === 0) {
      setReportError("Adicione algumas transações antes de gerar um relatório.");
      return;
    }

    setLoadingReport(true);
    setReportError(null);
    try {
      const result = await generateFinancialAdvice(transactions, userProfile);
      setAdvice(result);
    } catch (err) {
      setReportError("Falha ao gerar o relatório. Tente novamente mais tarde.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setSelectedFile(file);
      }
  };

  const clearAttachment = () => {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], "comando_voz.webm", { type: 'audio/webm' });
            setSelectedFile(audioFile);
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Erro ao acessar microfone:", err);
        alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
  };

  const getFileType = (file: File): 'image' | 'file' | 'audio' | 'doc' | 'sheet' => {
      const type = file.type;
      const name = file.name.toLowerCase();
      
      if (type.startsWith('image/')) return 'image';
      if (type.startsWith('audio/') || type.includes('webm')) return 'audio';
      if (name.endsWith('.doc') || name.endsWith('.docx') || type.includes('word')) return 'doc';
      if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || type.includes('sheet') || type.includes('excel')) return 'sheet';
      
      return 'file';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if ((!inputText.trim() && !selectedFile) || !chatInstance) return;

      // Prepare UI Message
      const newMessageId = Date.now().toString();
      const userMsg: ChatMessage = { 
          id: newMessageId, 
          role: 'user', 
          text: inputText || (selectedFile && getFileType(selectedFile) === 'audio' ? '🎤 Áudio enviado' : ''),
          attachment: selectedFile ? {
              type: getFileType(selectedFile),
              name: selectedFile.name,
              url: URL.createObjectURL(selectedFile)
          } : undefined
      };

      setMessages(prev => [...prev, userMsg]);
      setInputText('');
      const fileToSend = selectedFile;
      clearAttachment();
      setIsChatTyping(true);

      try {
          // Build Payload
          let messagePayload: (string | any)[] = [];
          
          if (fileToSend) {
              // Processa anexo localmente antes de enviar para a API
              const contentPart = await processAttachment(fileToSend);
              messagePayload.push(contentPart);
          }
          
          if (userMsg.text && userMsg.text !== '🎤 Áudio enviado') {
              messagePayload.push(userMsg.text);
          } else if (fileToSend && getFileType(fileToSend) === 'audio') {
              messagePayload.push("Analise este conteúdo de áudio/comando.");
          }

          // --- MUDANÇA PRINCIPAL: SERVERLESS REQUEST (Sem Streaming) ---
          const payloadToSend = messagePayload.length === 1 && typeof messagePayload[0] === 'string' 
            ? messagePayload[0] 
            : messagePayload.join('\n'); // Simplificação para envio de texto ao server

          const response = await chatInstance.sendMessage(payloadToSend, messages);
          
          const botMsgId = (Date.now() + 1).toString();

          // Adiciona resposta do Bot
          setMessages(prev => [...prev, { 
              id: botMsgId, 
              role: 'model', 
              text: response.text,
              sources: response.sources
          }]);

          // EXECUTE FUNCTION CALLS (Retornadas pela API)
          if (response.functionCalls && response.functionCalls.length > 0) {
              for (const fc of response.functionCalls) {
                  const args = fc.args || fc.args; // Garantia
                  
                  // --- ADD TRANSACTION ---
                  if (fc.name === 'addTransaction' && onAddTransaction) {
                       if (args.installmentCount && Number(args.installmentCount) > 1) {
                            // Lógica de Parcelas
                            const count = Number(args.installmentCount);
                            const totalAmount = Number(args.amount);
                            const monthlyAmount = totalAmount / count;
                            const transactionsToCreate: Transaction[] = [];
                            const baseDate = new Date(args.date);

                            for (let i = 0; i < count; i++) {
                                const installmentDate = new Date(baseDate);
                                installmentDate.setMonth(baseDate.getMonth() + i);

                                transactionsToCreate.push({
                                    id: Math.random().toString(36).substr(2, 9), // ID Temp, banco substitui
                                    description: `${args.description} (${i + 1}/${count})`,
                                    amount: parseFloat(monthlyAmount.toFixed(2)),
                                    type: args.type as 'INCOME' | 'EXPENSE',
                                    date: installmentDate.toISOString().split('T')[0],
                                    category: args.category || 'Outros',
                                    paymentMethod: args.paymentMethod || 'CREDIT_CARD',
                                    installments: { current: i + 1, total: count }
                                });
                            }
                            onAddTransaction(transactionsToCreate);
                            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Adicionei ${count} parcelas de R$ ${monthlyAmount.toFixed(2)}.` }]);

                       } else {
                            // Single Transaction
                            onAddTransaction({
                                ...args,
                                id: Math.random().toString(),
                                type: args.type as 'INCOME' | 'EXPENSE',
                                paymentMethod: args.paymentMethod || 'OTHER'
                            });
                            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "✅ Transação adicionada com sucesso!" }]);
                       }
                  }
                  
                  // --- DELETE TRANSACTION ---
                  else if (fc.name === 'deleteTransaction' && onDeleteTransaction) {
                      onDeleteTransaction(args.id);
                      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "🗑️ Transação removida." }]);
                  }

                  // --- EDIT TRANSACTION ---
                  else if (fc.name === 'editTransaction' && onEditTransaction) {
                      const { id, ...updates } = args;
                      onEditTransaction(id, updates);
                      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "✏️ Transação atualizada." }]);
                  }
              }
          }

      } catch (err: any) {
          console.error(err);
          let errorMessage = 'Desculpe, tive um erro ao processar sua mensagem.';
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMessage }]);
      } finally {
          setIsChatTyping(false);
      }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in duration-500">
        <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
          <BrainCircuit size={40} className="text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Dados Insuficientes</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          Adicione suas receitas e despesas para que a Inteligência Artificial possa analisar seus padrões e sugerir melhorias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Warning / Context Info */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
         <div className="flex items-start gap-3">
             <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                <Settings size={18} />
             </div>
             <div>
                 <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Contexto da Análise</h4>
                 <p className="text-blue-700 dark:text-blue-300 text-xs mt-0.5">
                    {userProfile 
                        ? `Baseado em salário de R$ ${userProfile.monthlySalary.toLocaleString('pt-BR')} e suas metas.`
                        : "Defina seu salário e metas para uma análise mais precisa."}
                 </p>
             </div>
         </div>
         <button 
            onClick={onOpenProfile}
            className="text-xs font-semibold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
         >
            {userProfile ? 'Editar Perfil' : 'Configurar Perfil'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: Static Report */}
          <div className="space-y-6">
            {!advice && !loadingReport && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-10 opacity-10 transform translate-x-10 -translate-y-10">
                    <Sparkles size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-indigo-100 font-medium bg-indigo-500/30 w-fit px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>Relatório Completo</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">Descubra insights ocultos</h2>
                    <p className="text-indigo-100 mb-8 leading-relaxed">
                    Gere um diagnóstico completo da sua saúde financeira. O Fin identificará onde você pode economizar.
                    </p>
                    
                    <button 
                    onClick={handleGenerateReport}
                    className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                    <BrainCircuit size={20} />
                    Gerar Análise
                    </button>
                </div>
                </div>
            )}

            {/* Loading State for Report */}
            {loadingReport && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-700 h-full min-h-[300px]">
                <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Analisando seus dados...</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">A IA está revisando {transactions.length} transações.</p>
                </div>
            )}

            {/* Error State */}
            {reportError && !loadingReport && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle size={24} />
                <p>{reportError}</p>
                </div>
            )}

            {/* Report Results */}
            {advice && !loadingReport && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-l-4 border-indigo-500 shadow-sm border-t border-r border-b border-slate-100 dark:border-slate-700 transition-colors">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">Resumo Executivo</h4>
                        <p className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed">
                            {advice.summary}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <TrendingUp size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Análise de Gastos</h4>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm">
                            {advice.spendingAnalysis}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                                <Lightbulb size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Recomendações</h4>
                        </div>
                        <ul className="space-y-3">
                            {advice.tips.map((tip, idx) => (
                                <li key={idx} className="flex gap-3">
                                    <div className="min-w-[20px] h-5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold border border-amber-200 dark:border-amber-800 mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-300 text-sm">{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
          </div>

          {/* RIGHT COLUMN: Chatbot Fin */}
          <div className="flex flex-col h-[600px] lg:h-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Bot className="text-white" size={20} />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          Fin 
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 uppercase">
                              IA
                          </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online • Analista Financeiro
                      </p>
                  </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth">
                  {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          
                          {/* Attachment Display for User Messages */}
                          {msg.role === 'user' && msg.attachment && (
                              <div className="mb-2 max-w-[85%] bg-blue-600 rounded-2xl p-2 rounded-br-none">
                                  {msg.attachment.type === 'image' && (
                                      <img src={msg.attachment.url} alt="Attachment" className="max-w-full h-auto rounded-xl max-h-48 object-cover" />
                                  )}
                                  {msg.attachment.type === 'file' && (
                                      <div className="flex items-center gap-2 text-white p-2">
                                          <FileText size={20} />
                                          <span className="text-sm truncate underline">{msg.attachment.name}</span>
                                      </div>
                                  )}
                                  {msg.attachment.type === 'doc' && (
                                      <div className="flex items-center gap-2 text-white p-2">
                                          <FileType size={20} />
                                          <span className="text-sm truncate underline">{msg.attachment.name}</span>
                                      </div>
                                  )}
                                  {msg.attachment.type === 'sheet' && (
                                      <div className="flex items-center gap-2 text-white p-2">
                                          <FileSpreadsheet size={20} />
                                          <span className="text-sm truncate underline">{msg.attachment.name}</span>
                                      </div>
                                  )}
                                  {msg.attachment.type === 'audio' && (
                                      <div className="flex items-center gap-2 text-white p-2">
                                          <Mic size={20} />
                                          {/* Use audio element for playback preview */}
                                          <audio controls src={msg.attachment.url} className="h-8 w-48" />
                                      </div>
                                  )}
                              </div>
                          )}

                          <div className={`
                              max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
                              ${msg.role === 'user' 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-600'}
                          `}>
                              {msg.role === 'model' && msg.text === '' ? (
                                  <div className="flex gap-1 h-5 items-center px-1">
                                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                  </div>
                              ) : (
                                  <div className="whitespace-pre-line">
                                      {msg.text}
                                  </div>
                              )}
                          </div>
                          
                          {/* Display Sources (Grounding) */}
                          {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                             <div className="mt-2 ml-1 max-w-[85%]">
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wide">Fontes consultadas:</p>
                                <div className="flex flex-wrap gap-2">
                                    {msg.sources.map((source, idx) => (
                                        <a 
                                            key={idx}
                                            href={source.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                        >
                                            <ExternalLink size={10} />
                                            <span className="truncate max-w-[120px]">{source.title}</span>
                                        </a>
                                    ))}
                                </div>
                             </div>
                          )}
                      </div>
                  ))}
                  <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                  {/* Attachment Preview Pill */}
                  {selectedFile && (
                      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg mb-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 truncate">
                              {getFileType(selectedFile) === 'image' && <ImageIcon size={14} className="text-blue-500" />}
                              {getFileType(selectedFile) === 'doc' && <FileType size={14} className="text-blue-700" />}
                              {getFileType(selectedFile) === 'sheet' && <FileSpreadsheet size={14} className="text-emerald-600" />}
                              {getFileType(selectedFile) === 'file' && <FileText size={14} className="text-slate-500" />}
                              {getFileType(selectedFile) === 'audio' && <Mic size={14} className="text-purple-500" />}
                              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                          </div>
                          <button onClick={clearAttachment} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-slate-500">
                              <X size={14} />
                          </button>
                      </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                      {/* File Input Hidden */}
                      <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="image/*,application/pdf,audio/*,.csv,.txt,.doc,.docx,.xls,.xlsx"
                      />
                      
                      {/* Attach Button */}
                      <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isChatTyping || isRecording}
                          className="p-2.5 mb-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                          title="Anexar arquivo (Img, PDF, Áudio, Excel, Word)"
                      >
                          <Paperclip size={20} />
                      </button>

                      {/* Input Text */}
                      <input 
                          type="text" 
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={isRecording ? "Gravando áudio..." : "Digite ou envie um áudio..."}
                          className={`flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700/50 border rounded-xl text-sm outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 ${isRecording ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600' : 'border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700'}`}
                          disabled={isChatTyping || isRecording}
                      />

                      {/* Microphone / Stop Button */}
                       {isRecording ? (
                          <button 
                             type="button"
                             onClick={stopRecording}
                             className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors shadow-lg shadow-red-500/20 animate-pulse"
                             title="Parar Gravação"
                           >
                             <StopCircle size={18} fill="currentColor" />
                           </button>
                        ) : (
                          <button 
                             type="button"
                             onClick={startRecording}
                             disabled={isChatTyping || !!inputText || !!selectedFile}
                             className={`p-3 rounded-xl transition-colors ${!!inputText || !!selectedFile ? 'hidden' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                             title="Gravar Áudio"
                           >
                             <Mic size={18} />
                           </button>
                        )}

                      {/* Send Button (Only shows if there is content or text) */}
                      {(!!inputText || !!selectedFile) && !isRecording && (
                        <button 
                            type="submit" 
                            disabled={isChatTyping}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={18} />
                        </button>
                      )}
                  </form>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AIReport;