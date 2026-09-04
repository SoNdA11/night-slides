import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../App';

const AVATARS = ['🌍', '🎮', '🚀', '🎯', '🔥', '⚡', '🌟', '💎', '🎪', '🏆', '🎨', '🎵'];

function getRoomFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/[?&]room=([A-Za-z0-9]+)/);
  return match ? match[1].toUpperCase() : null;
}

export default function JoinPage() {
  const { joinRoom, setViewMode } = useGame();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🌍');
  const [step, setStep] = useState<'code' | 'profile'>('code');
  const [error, setError] = useState('');

  // Auto-fill room code from URL hash
  useEffect(() => {
    const autoCode = getRoomFromHash();
    if (autoCode) {
      setCode(autoCode);
      setStep('profile');
    }
  }, []);

  const handleCodeSubmit = () => {
    if (code.length < 4) {
      setError('Código muito curto');
      return;
    }
    setStep('profile');
    setError('');
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError('Digite seu nome');
      return;
    }
    joinRoom(code.toUpperCase(), name.trim(), selectedAvatar);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="w-full h-full flex flex-col items-center justify-center p-6"
    >
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => step === 'profile' ? setStep('code') : setViewMode('landing')}
        className="absolute top-6 left-6 text-white/60 hover:text-white font-display text-sm"
      >
        ← Voltar
      </motion.button>

      <AnimatePresence mode="wait">
        {step === 'code' ? (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="text-6xl mb-6">📱</div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">
              Entrar na Sala
            </h2>
            <p className="text-white/50 mb-8 text-center">
              Digite o código exibido na TV
            </p>

            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={6}
              className="w-full py-4 px-6 rounded-2xl text-center text-2xl font-display font-bold
                tracking-[0.3em] glass text-white placeholder-white/30
                focus:outline-none focus:glow-blue transition-all duration-300
                uppercase"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-neon-pink text-sm mt-3"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCodeSubmit}
              className="mt-8 w-full py-4 rounded-2xl font-display font-bold text-lg
                bg-gradient-to-r from-neon-blue to-neon-purple text-white
                glow-blue transition-all duration-300"
            >
              Continuar →
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="text-6xl mb-6">{selectedAvatar}</div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">
              Seu Perfil
            </h2>
            <p className="text-white/50 mb-8 text-center">
              Escolha um avatar e digite seu nome
            </p>

            {/* Avatar grid */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {AVATARS.map((avatar) => (
                <motion.button
                  key={avatar}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center
                    transition-all duration-200 ${
                      selectedAvatar === avatar
                        ? 'bg-neon-blue/30 ring-2 ring-neon-blue glow-blue'
                        : 'glass hover:bg-white/10'
                    }`}
                >
                  {avatar}
                </motion.button>
              ))}
            </div>

            {/* Name input */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={15}
              className="w-full py-4 px-6 rounded-2xl text-center text-xl font-display
                glass text-white placeholder-white/30
                focus:outline-none focus:glow-purple transition-all duration-300"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-neon-pink text-sm mt-3"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoin}
              className="mt-8 w-full py-4 rounded-2xl font-display font-bold text-lg
                bg-gradient-to-r from-neon-green to-neon-blue text-white
                glow-green transition-all duration-300"
            >
              Entrar no Jogo! 🎮
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
