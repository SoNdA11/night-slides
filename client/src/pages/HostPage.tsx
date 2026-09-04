import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../App';
import QRCode from 'qrcode';

const ROUND_ICONS: Record<string, string> = {
  guess: '🌍',
  truefalse: '✅',
  intruder: '🧩',
  flash: '👁️',
  trust: '🧠',
  prank: '🌊',
};

export default function HostPage() {
  const {
    state, room, currentRound, timeRemaining, countdown,
    scoreChanges, ranking, champion,
    startGame, startRoundNow, nextRound, revealAnswer, showRanking, restartGame,
    roundIntroIndex, consensusRestart, consensusPhase,
    trustPhase, trustAdvance,
  } = useGame();

  const [lanIp, setLanIp] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const host = window.location.hostname;
  const isTunnel = host.includes('trycloudflare.com') || host.includes('ngrok') || host.includes('loca.lt');
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = isTunnel ? 'https:' : window.location.protocol;

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(d => { if (d.ips?.[0]) setLanIp(d.ips[0]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = window.location.hostname;
    const isT = h.includes('trycloudflare.com') || h.includes('ngrok') || h.includes('loca.lt');
    const isL = h === 'localhost' || h === '127.0.0.1';
    const qrHost = isT ? h : (isL ? (lanIp || h) : h);
    const p = window.location.port ? `:${window.location.port}` : '';
    const proto = isT ? 'https:' : window.location.protocol;
    const url = `${proto}//${qrHost}${p}${window.location.pathname}#/join?room=${state.roomCode}`;
    QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#0A0A1A', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [state.roomCode, lanIp]);

  // ── Waiting Phase ──
  if (room?.phase === 'waiting') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="glass-strong rounded-3xl p-8 flex flex-col items-center">
          <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="font-display text-3xl font-bold text-white mb-6">ENTRE NO JOGO</motion.h2>
          <div className="bg-white rounded-2xl p-4 mb-6 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-white/30">Carregando QR...</div>
            )}
          </div>
          <p className="text-white/40 text-sm mb-2">Código da sala</p>
          <p className="font-display text-4xl font-bold text-neon-blue tracking-[0.3em]">{state.roomCode}</p>
        </motion.div>

        {room && room.players.length > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 w-full max-w-lg">
            <p className="text-white/40 text-sm text-center mb-3">{room.players.length} jogador(es)</p>
            <div className="flex flex-wrap justify-center gap-3">
              {room.players.map((p, idx) => (
                <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.1 }}
                  className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-display font-bold text-white">{p.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.button initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={startGame}
          className="mt-8 py-4 px-12 rounded-2xl font-display font-bold text-xl bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all duration-300">
          🚀 Iniciar Jogo
        </motion.button>
      </motion.div>
    );
  }

  // ── Round Intro ──
  if (room?.phase === 'roundIntro' && currentRound) {
    const icon = ROUND_ICONS[currentRound.type] || '❓';
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-white/40 text-2xl mb-4 font-display">
          ROUND {String(roundIntroIndex + 1).padStart(2, '0')}
        </motion.p>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="text-[8rem] mb-4">
          {icon}
        </motion.div>

        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="font-display text-5xl font-bold gradient-text mb-4 text-center">
          {currentRound.title}
        </motion.h1>

        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-white/50 text-2xl mb-6 font-display">
          {currentRound.subtitle}
        </motion.p>

        {currentRound.rules && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
            className="glass-strong rounded-2xl p-6 max-w-lg text-center mb-8">
            <p className="text-white/70 text-lg font-display leading-relaxed">{currentRound.rules}</p>
          </motion.div>
        )}

        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={startRoundNow}
          className="py-4 px-12 rounded-2xl font-display font-bold text-xl bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all duration-300">
          ▶️ JOGAR!
        </motion.button>
      </motion.div>
    );
  }

  // ── Countdown ──
  if (room?.phase === 'countdown') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`countdown-${countdown}`}
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-[12rem] font-display font-bold gradient-text">
            {countdown > 0 ? countdown : 'GO!'}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Playing ──
  if (room?.phase === 'playing' && currentRound) {
    const answeredCount = room.players.filter(p => p.answer !== null).length;
    const playerCount = room.players.length;
    const isIntruder = currentRound.type === 'intruder';
    const isConsensus = currentRound.type === 'consensus';
    const isFlash = currentRound.type === 'flash';
    const isTrust = currentRound.type === 'trust';

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center p-6 overflow-y-auto">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-2">
          <p className="font-display text-lg text-white/40">ROUND</p>
          <p className="font-display text-6xl font-bold text-white">{String(room.currentRound + 1).padStart(2, '0')}</p>
        </motion.div>

        <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="font-display text-2xl text-white/70 mb-4">{currentRound.title}</motion.h3>

        {isIntruder && currentRound.intruderImages ? (
          <div className="w-full max-w-4xl grid grid-cols-2 gap-3 mb-4">
            {currentRound.intruderImages.map((img, idx) => (
              <motion.div key={img.country}
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="aspect-square rounded-2xl overflow-hidden relative ring-2 ring-white/10">
                <img src={img.image} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden mb-4 relative">
            {isFlash && timeRemaining <= 0 ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <p className="text-white/30 text-xl font-display">Imagem oculta!</p>
              </div>
            ) : (
              <>
                <img src={currentRound.image} alt="Round" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </>
            )}
            <div className="absolute bottom-4 right-4">
              <motion.div
                animate={timeRemaining <= 5 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
                className={`font-display text-5xl font-bold ${timeRemaining <= 5 ? 'text-neon-pink' : 'text-white'} drop-shadow-lg`}>
                {timeRemaining}s
              </motion.div>
            </div>
          </motion.div>
        )}

        {isIntruder && (
          <div className="mb-4">
            <motion.div
              animate={timeRemaining <= 5 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
              className={`font-display text-5xl font-bold ${timeRemaining <= 5 ? 'text-neon-pink' : 'text-white'}`}>
              {timeRemaining}s
            </motion.div>
          </div>
        )}

        <div className="flex gap-3 items-center flex-wrap justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl px-4 py-2">
            <p className="text-white/40 text-sm">
              Respostas: <span className="text-neon-green font-bold">{answeredCount}</span> / {playerCount}
            </p>
          </motion.div>

          {isConsensus && consensusPhase === 'reveal' && (
            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={consensusRestart}
              className="py-2 px-6 rounded-2xl font-display font-bold text-base bg-gradient-to-r from-neon-orange to-neon-yellow text-white transition-all duration-300">
              🔄 Liberar Segunda Rodada de Votos
            </motion.button>
          )}

          {isTrust && (trustPhase === 'confirm' || trustPhase === 'hint') && (
            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={trustAdvance}
              className="py-2 px-6 rounded-2xl font-display font-bold text-base bg-gradient-to-r from-neon-orange to-neon-pink text-white transition-all duration-300">
              {trustPhase === 'confirm' ? '💡 Revelar Pista' : '✅ Encerrar Rodada'}
            </motion.button>
          )}

          {!isConsensus && !isTrust && (
            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={revealAnswer}
              className="py-2 px-6 rounded-2xl font-display font-bold text-base bg-gradient-to-r from-neon-orange to-neon-pink text-white transition-all duration-300">
              🔍 Revelar
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Reveal ──
  if (room?.phase === 'reveal' || room?.phase === 'scoring') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-white/50 text-2xl mb-6 font-display">A resposta era...</motion.p>

        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-[8rem] mb-4">{currentRound?.correctFlag}</motion.div>

        <motion.h2 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="font-display text-6xl font-bold text-white mb-8">{currentRound?.correctAnswer}</motion.h2>

        {scoreChanges.length > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            className="w-full max-w-lg space-y-3 mb-8">
            {scoreChanges.map((sc, idx) => (
              <motion.div key={sc.playerId} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="glass rounded-2xl p-4 flex items-center gap-4">
                <span className="text-3xl">{sc.avatar}</span>
                <span className="font-display font-bold text-white flex-1">{sc.name}</span>
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className={`font-display text-2xl font-bold ${sc.delta >= 0 ? 'text-neon-green' : 'text-neon-pink'}`}>
                  {sc.delta >= 0 ? '+' : ''}{sc.delta}
                </motion.span>
                <span className="text-white/40 text-sm">→ {sc.total}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={showRanking}
          className="py-3 px-8 rounded-2xl font-display font-bold text-lg bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all duration-300">
          🏆 Ver Ranking
        </motion.button>
      </motion.div>
    );
  }

  // ── Ranking ──
  if (room?.phase === 'ranking') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <motion.h2 initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="font-display text-5xl font-bold gradient-text mb-8">🏆 RANKING</motion.h2>

        <div className="w-full max-w-2xl space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {ranking.map((entry, idx) => (
            <motion.div key={entry.playerId || idx} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.15 }}
              className={`flex items-center gap-4 p-4 rounded-2xl ${idx === 0 ? 'bg-neon-yellow/10 ring-2 ring-neon-yellow/30' : 'glass'}`}>
              <span className="font-display text-2xl font-bold text-white/50 w-12 text-center">
                {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : `${entry.position}º`}
              </span>
              <span className="text-4xl">{entry.avatar}</span>
              <span className="font-display text-xl font-bold text-white flex-1">
                {entry.name}
                {room?.players.find(p => p.id === entry.playerId)?.hasShield && (
                  <span className="ml-2 text-neon-blue">🛡️</span>
                )}
              </span>
              <span className="font-display text-2xl font-bold text-neon-yellow">{entry.score}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={nextRound}
            className="py-3 px-8 rounded-2xl font-display font-bold text-lg bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all duration-300">
            ▶️ Próxima Rodada
          </motion.button>

          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={restartGame}
            className="py-3 px-8 rounded-2xl font-display font-bold text-lg glass text-white transition-all duration-300">
            🔄 Reiniciar
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── Prank — Underwater Final Round ──
  if (room?.phase === 'prank') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 via-cyan-950/80 to-black/90" />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="text-[9rem] mb-2 relative z-10">🌊</motion.div>
        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="font-display text-6xl font-bold text-white mb-2 relative z-10">RODADA FINAL!</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-cyan-300 text-2xl mb-6 font-display relative z-10">Última chance de virar o jogo!</motion.p>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 }}
          className="w-full max-w-2xl aspect-video rounded-3xl overflow-hidden relative z-10 shadow-2xl mb-6">
          <img src="/img/prank-underwater.png" alt="Final Round" className="w-full h-full object-cover" />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-white/80 text-xl font-display relative z-10 text-center">
          Prepare-se para a rodada decisiva!
        </motion.p>
      </motion.div>
    );
  }

  // ── Game Over ──
  if (room?.phase === 'gameOver') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="text-8xl mb-6">🏆</motion.div>
        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="font-display text-6xl font-bold gradient-text mb-4">GAME OVER</motion.h1>

        {champion && (
          <>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-white/50 text-xl mb-4 font-display">CAMPEÃO</motion.p>
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
              className="text-[8rem] mb-4">{champion.avatar}</motion.div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
              className="font-display text-5xl font-bold text-white mb-2">{champion.name}</motion.h2>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1 }}
              className="font-display text-3xl font-bold text-neon-yellow">{champion.score} PONTOS</motion.p>
          </>
        )}

        {ranking.length > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.5 }}
            className="mt-8 w-full max-w-lg space-y-2 max-h-[30vh] overflow-y-auto pr-2">
            {ranking.map((entry, idx) => (
              <motion.div key={idx} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.6 + idx * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl glass">
                <span className="font-display text-lg font-bold text-white/50 w-8">
                  {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : `${entry.position}º`}
                </span>
                <span className="text-2xl">{entry.avatar}</span>
                <span className="font-display font-bold text-white flex-1">{entry.name}</span>
                <span className="font-display text-lg font-bold text-neon-yellow">{entry.score}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 2 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={restartGame}
          className="mt-8 py-3 px-8 rounded-2xl font-display font-bold text-lg bg-gradient-to-r from-neon-pink to-neon-purple text-white glow-pink transition-all duration-300">
          🔄 Jogar Novamente
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-neon-blue rounded-full animate-spin" />
    </div>
  );
}
