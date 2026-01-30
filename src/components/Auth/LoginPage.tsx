import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('inactive') === 'true') {
      setError('Sua conta está inativa. Entre em contato com o administrador.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-0">
      {/* Container Principal - Tela Cheia com proporção 40/60 */}
      <div className="w-full h-screen grid grid-cols-1 md:grid-cols-10 bg-[#1E293B]/50 backdrop-blur-xl border-none overflow-hidden">

        <div className="flex flex-col bg-[#0F172A] md:col-span-4 p-12 lg:p-24 pt-[15vh] lg:pt-[20vh]">
          <div className="max-w-sm w-full mx-auto md:mx-0">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">
                Bem-vindo
              </h2>
              <p className="text-gray-400 text-sm lg:text-base font-normal opacity-60">
                Acesse sua conta para continuar
              </p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-shake font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111827]/50 border border-[#0F4C5C]/20 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#0F4C5C]/50 focus:border-[#0F4C5C] transition-all text-base font-normal"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111827]/50 border border-[#0F4C5C]/20 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#0F4C5C]/50 focus:border-[#0F4C5C] transition-all text-base font-normal"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 text-white rounded-lg font-semibold text-lg shadow-lg shadow-[#0F4C5C]/10 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? 'Processando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-12 text-center md:text-left">
              <p className="text-[9px] text-gray-700 font-medium tracking-[0.2em] uppercase">© 2026 COMECCE CONSULTORIA FINANCEIRA.</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col relative bg-[#1E293B] md:col-span-6 p-12 lg:p-24 pt-[15vh] lg:pt-[20vh] border-l border-white/5">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: 'url("/login-visual.png")' }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/90 via-[#0F172A]/40 to-[#0F172A]/90"></div>

          <div className="absolute top-12 left-12 lg:top-16 lg:left-24 z-20">
            <div className="flex items-center space-x-3">
              <img
                src="/logo-removebg-preview.png"
                alt="COMECCE Logo"
                className="w-10 h-10 object-contain opacity-90"
              />
              <div>
                <h1 className="text-xl font-bold text-white tracking-widest leading-none opacity-90">
                  COMECCE
                </h1>
                <p className="text-[8px] text-[#1a7a94] font-bold tracking-[0.3em] mt-1 uppercase opacity-90">Consultoria Financeira</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full max-w-xl">
            <div className="space-y-5">
              <h3 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                Seu departamento financeiro online
              </h3>
              <p className="text-gray-300 text-sm lg:text-lg leading-relaxed font-light opacity-70">
                Foque no seu negócio. Delegue o financeiro para o nosso time de especialistas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
