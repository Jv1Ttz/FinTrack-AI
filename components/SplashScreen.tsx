import React, { useEffect, useState } from 'react';
import { PieChart } from 'lucide-react';
import { APP_NAME } from '../constants';

const VERSES = [
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "Esforça-te, e tem bom ânimo; não temas, nem te espantes.", ref: "Josué 1:9" },
  { text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", ref: "Jeremias 29:11" },
  { text: "Entrega o teu caminho ao Senhor; confia nele, e ele o fará.", ref: "Salmos 37:5" },
  { text: "Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.", ref: "Isaías 40:31" },
  { text: "O Senhor é a minha luz e a minha salvação; a quem temerei?", ref: "Salmos 27:1" },
  { text: "Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo.", ref: "Salmos 23:4" },
  { text: "Pedi, e dar-se-vos-á; buscai, e encontrareis; batei, e abrir-se-vos-á.", ref: "Mateus 7:7" },
  { text: "E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.", ref: "Filipenses 4:7" }
];

interface SplashScreenProps {
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [verse, setVerse] = useState(VERSES[0]);

  useEffect(() => {
    const randomVerse = VERSES[Math.floor(Math.random() * VERSES.length)];
    setVerse(randomVerse);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-white px-6 overflow-hidden">
      
      {/* Styles for Custom Animations */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(3); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 2.5s infinite ease-out;
        }
        .animate-ripple-delay {
          animation: ripple 2.5s infinite ease-out 1.25s;
        }
      `}</style>

      {/* Main Content Container */}
      <div className="flex flex-col items-center mb-16 animate-in zoom-in-95 duration-1000 slide-in-from-bottom-5">
        
        {/* Logo Wrapper - Isolate relative positioning here so ripples center on the ICON, not the text */}
        <div className="relative mb-8">
            {/* Animated Ripple Circles - Centered using negative margins (-mt-12 -ml-12 for w-24 h-24) to avoid transform conflicts */}
            <div className="absolute top-1/2 left-1/2 w-24 h-24 -mt-12 -ml-12 bg-blue-500 rounded-full animate-ripple -z-10 opacity-0"></div>
            <div className="absolute top-1/2 left-1/2 w-24 h-24 -mt-12 -ml-12 bg-blue-500 rounded-full animate-ripple-delay -z-10 opacity-0"></div>

            {/* Icon Box */}
            <div className="relative p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl shadow-blue-900/50 z-10">
                <PieChart size={56} className="text-white drop-shadow-md" />
            </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          {APP_NAME}
        </h1>
      </div>

      {/* Quote Area */}
      <div className="max-w-md text-center space-y-5 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300 z-10 px-4">
        <p className="text-xl md:text-2xl font-serif italic text-slate-200 leading-relaxed drop-shadow-sm">
          "{verse.text}"
        </p>
        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto rounded-full opacity-70"></div>
        <p className="text-sm font-medium text-slate-400 uppercase tracking-[0.2em]">
          {verse.ref}
        </p>
      </div>

      {/* Modern Circular Loader at Bottom - Using w-full and justify-center to ensure horizontal alignment */}
      <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-4">
         <div className="relative w-10 h-10">
            {/* Background ring */}
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
         </div>
         <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase animate-pulse">Carregando</span>
      </div>
    </div>
  );
};

export default SplashScreen;