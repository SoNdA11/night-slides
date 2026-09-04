import { motion } from 'framer-motion';
import { useGame } from '../App';

const AVATARS = ['🌍', '🎮', '🚀', '🎯', '🔥', '⚡', '🌟', '💎', '🎪', '🏆', '🎨', '🎵'];

export default function LandingPage() {
  const { setViewMode, createRoom } = useGame();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center p-6"
    >
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ['#FF006E', '#3A86FF', '#06D6A0', '#FFD60A', '#8338EC'][i % 5],
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="text-8xl mb-6"
      >
        🌍
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="font-display text-5xl md:text-7xl font-bold gradient-text mb-2"
      >
        NIGHT SLIDES
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/60 text-lg mb-12 font-body"
      >
        O jogo geography para sua noite de apresentação
      </motion.p>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <motion.button
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createRoom}
          className="w-full py-4 px-8 rounded-2xl font-display font-bold text-lg
            bg-gradient-to-r from-neon-pink to-neon-purple text-white
            glow-pink transition-all duration-300"
        >
          🎮 Criar Sala
        </motion.button>

        <motion.button
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1.0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setViewMode('join')}
          className="w-full py-4 px-8 rounded-2xl font-display font-bold text-lg
            glass text-white glow-blue transition-all duration-300"
        >
          📱 Entrar na Sala
        </motion.button>

        <motion.button
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setViewMode('tv')}
          className="w-full py-4 px-8 rounded-2xl font-display font-bold text-lg
            glass text-white glow-green transition-all duration-300"
        >
          📺 Modo TV
        </motion.button>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-12 text-white/30 text-sm"
      >
        Descubra os locais. Ganhe pontos. Vença seus amigos.
      </motion.p>
    </motion.div>
  );
}
