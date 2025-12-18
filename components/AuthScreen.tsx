import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, PieChart, AlertCircle } from 'lucide-react';
import { APP_NAME } from '../constants';
import { supabase } from '../supabase';

interface AuthScreenProps {
  onLogin: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isLogin) {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Se deu certo, avisa o App.tsx (que vai ser atualizado no próximo passo)
        onLogin();
      } else {
        // --- CADASTRO ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Sucesso no cadastro
        alert('Cadastro realizado! Verifique seu email para confirmar a conta antes de fazer login.');
        setIsLogin(true); // Volta para a tela de login
      }
    } catch (error: any) {
      console.error(error);
      let msg = "Ocorreu um erro ao tentar autenticar.";
      if (error.message.includes("Invalid login")) msg = "Email ou senha incorretos.";
      if (error.message.includes("User already registered")) msg = "Este email já está cadastrado.";
      if (error.message.includes("Password should be")) msg = "A senha deve ter pelo menos 6 caracteres.";
      
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Nota: O Login com Google precisa ser ativado no painel do Supabase antes de funcionar.
    // Por enquanto, vamos deixar o código pronto.
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) throw error;
    } catch (error: any) {
        setErrorMessage("Erro ao iniciar login com Google: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-500">
      
      {/* Left Column - Branding (Igual ao original) */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1951&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-900/90"></div>
        
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
               <PieChart size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
           <h2 className="text-4xl font-bold leading-tight">
             Domine suas finanças com o poder da Inteligência Artificial.
           </h2>
           <p className="text-blue-100 text-lg leading-relaxed">
             Seus dados agora estão seguros na nuvem. Acesse de qualquer lugar, a qualquer momento.
           </p>
        </div>

        <div className="relative z-10 text-sm text-blue-200/60">
          © 2024 {APP_NAME} Inc. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
            
            <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                       <PieChart size={32} />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    {isLogin ? 'Insira seus dados para acessar.' : 'Comece sua jornada financeira hoje.'}
                </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0" />
                    {errorMessage}
                </div>
            )}

            {/* Google Button */}
            <button 
                onClick={handleGoogleLogin}
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium h-12 rounded-xl transition-all active:scale-[0.99]"
            >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Entrar com Google</span>
            </button>

            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase tracking-wider">ou continue com email</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            {isLogin ? 'Acessar Conta' : 'Criar Conta'}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center pt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button 
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setErrorMessage(null);
                        }} 
                        className="ml-2 font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                    >
                        {isLogin ? 'Cadastre-se' : 'Entrar'}
                    </button>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
};

export default AuthScreen;