import React, { useState, useEffect } from 'react';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulação de delay para efeito premium
        setTimeout(() => {
            if (password === 'sf@2026') {
                localStorage.setItem('sf_auth_session', 'true');
                onLogin();
            } else {
                setError(true);
                setIsLoading(false);
                // Reset error after 2 seconds
                setTimeout(() => setError(false), 2000);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden relative">
            {/* Background Animated Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 transform transition-all hover:scale-[1.01]">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-3">
                            <span className="text-4xl">🔒</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">SF IMPORTS</h1>
                        <p className="text-white/50 text-sm font-medium">SISTEMA DE PRECIFICAÇÃO v3.0</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">
                                Acesso Restrito
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Digite sua senha"
                                    className={`w-full bg-white/5 border ${error ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/10 group-hover:border-white/20'} rounded-xl py-4 px-5 text-white placeholder-white/20 outline-none transition-all focus:bg-white/10 focus:border-purple-500/50`}
                                    autoFocus
                                />
                                {isLoading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            {error && (
                                <p className="text-red-400 text-xs mt-2 ml-1 animate-bounce">
                                    ⚠️ Senha incorreta. Tente novamente.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-purple-500/20 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <span className="flex items-center justify-center gap-2">
                                ENTRAR NO SISTEMA
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </span>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center px-4">
                        <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-tighter">
                            Este sistema é de uso exclusivo da SF Imports. O acesso não autorizado é monitorado e proibido.
                        </p>
                    </div>
                </div>

                <p className="text-center mt-6 text-white/20 text-xs">
                    © 2026 SF Imports • Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};
