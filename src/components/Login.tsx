import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Church, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simple mock logic for the single access requested
    setTimeout(() => {
      if (username === 'admin' && password === 'Jesussalva') {
        onLogin();
      } else {
        setError('Acesso negado. Verifique os dados.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] selection:bg-sky-500/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="card-sleek !p-0 overflow-hidden shadow-2xl">
          <div className="p-8 bg-sky-500/10 text-white text-center relative overflow-hidden border-b border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4 shadow-lg shadow-sky-500/20"
            >
              <Church className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold">Portal Membros</h1>
            <p className="text-slate-400 text-sm mt-1">Acesse a gestão Ecclesia</p>
          </div>

          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Usuário</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-600"
                    placeholder="admin"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                Acesso Seguro • Ecclesia 
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
