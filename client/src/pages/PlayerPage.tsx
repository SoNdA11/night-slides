import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../App';
import { getSocket } from '../services/socket';

// ─── Pinch-to-Zoom + Pan Image ────────────────────────────
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);

  const getDistance = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && scale > 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isPanning.current = true;
    }
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const delta = dist / lastDistance.current;
      lastDistance.current = dist;
      setScale(s => Math.min(Math.max(s * delta, 1), 4));
    } else if (e.touches.length === 1 && isPanning.current && scale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - (lastTouch.current?.x ?? 0);
      const dy = e.touches[0].clientY - (lastTouch.current?.y ?? 0);
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset(o => ({
        x: Math.min(Math.max(o.x + dx, -200 * scale), 200 * scale),
        y: Math.min(Math.max(o.y + dy, -200 * scale), 200 * scale),
      }));
    }
  }, [scale]);

  const onTouchEnd = useCallback(() => {
    lastDistance.current = null;
    lastTouch.current = null;
    isPanning.current = false;
  }, []);

  const onDoubleClick = useCallback(() => {
    setScale(s => {
      if (s > 1) { setOffset({ x: 0, y: 0 }); return 1; }
      return 2.5;
    });
  }, []);

  return (
    <div
      className="w-full h-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={onDoubleClick}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-150"
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          transformOrigin: 'center center',
        }}
        draggable={false}
      />
    </div>
  );
}

export default function PlayerPage() {
  const {
    state, room, currentRound, timeRemaining, countdown,
    myAnswer, myAnswerCorrect, answerRegistered,
    scoreChanges, ranking, champion,
    submitAnswer, challengePlayer, acceptChallenge, usePowerUp,
    trustAnswer, trustConfirm, trustRevote,
    pendingChallenge, setPendingChallenge,
    myStreak, powerUpNotification,
    consensusPhase, consensusVotes, flashExpired,
    trustPhase, trustHint,
    setMyAnswer, setAnswerRegistered,
  } = useGame();

  const [showWaiting, setShowWaiting] = useState(true);
  const [challengeTarget, setChallengeTarget] = useState<string | null>(null);
  const [challengeSent, setChallengeSent] = useState(false);

  useEffect(() => {
    if (room && room.phase !== 'waiting') setShowWaiting(false);
    if (room && room.phase === 'waiting') setShowWaiting(true);
  }, [room?.phase]);

  // Reset challenge state on phase change
  useEffect(() => {
    if (room?.phase === 'ranking') {
      setChallengeSent(false);
      setChallengeTarget(null);
    }
    if (room?.phase === 'playing') {
      setPendingChallenge(null);
    }
  }, [room?.phase, setPendingChallenge]);

  const myScoreChange = scoreChanges.find(s => s.playerId === state.playerId);

  // ── Waiting Screen ──
  if (showWaiting && room?.phase === 'waiting') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="w-full h-full flex flex-col items-center justify-center p-6">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-6">{state.playerAvatar}</motion.div>
        <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="font-display text-3xl font-bold text-white mb-2">Você entrou!</motion.h2>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-white/50 text-lg mb-4">{state.playerName}</motion.p>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="glass rounded-2xl px-6 py-3">
          <p className="text-white/40 text-sm">Sala</p>
          <p className="font-display text-2xl font-bold text-neon-blue tracking-widest">{state.roomCode}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-8 flex items-center gap-2 text-white/40">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-white/20 border-t-neon-blue rounded-full" />
          Aguardando o host iniciar...
        </motion.div>
        {room && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="mt-8 w-full max-w-sm">
            <p className="text-white/30 text-sm text-center mb-3">{room.players.length} jogador(es) conectado(s)</p>
            <div className="flex flex-wrap justify-center gap-2">
              {room.players.map((p) => (
                <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="glass rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-lg">{p.avatar}</span>
                  <span className="text-sm text-white/70">{p.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ── Countdown ──
  if (room?.phase === 'countdown') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={`countdown-${countdown}`}
            initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-9xl font-display font-bold gradient-text">
            {countdown > 0 ? countdown : 'GO!'}
          </motion.div>
        </AnimatePresence>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-white/50 text-xl mt-4 font-display">Preparar...</motion.p>
      </motion.div>
    );
  }

  // ── Playing ──
  if (room?.phase === 'playing' && currentRound) {
    const isPrank = currentRound.type === 'prank';
    const isIntruder = currentRound.type === 'intruder';
    const isTrueFalse = currentRound.type === 'truefalse';
    const isFlash = currentRound.type === 'flash';
    const isConsensus = currentRound.type === 'consensus';
    const isTrust = currentRound.type === 'trust';
    const multiplier = currentRound.multiplier || 1;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col p-4 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-white/40">ROUND</span>
            <span className="font-display text-2xl font-bold text-neon-blue">
              {String(room.currentRound + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {myStreak >= 3 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="font-display text-sm font-bold text-neon-orange bg-neon-orange/10 px-2 py-1 rounded-full">
                🔥 {myStreak}x streak
              </motion.span>
            )}
            {multiplier > 1 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="font-display text-lg font-bold text-neon-yellow bg-neon-yellow/10 px-3 py-1 rounded-full">
                {multiplier}x PONTOS
              </motion.span>
            )}
            <motion.div animate={timeRemaining <= 5 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
              className={`font-display text-3xl font-bold ${timeRemaining <= 5 ? 'text-neon-pink' : 'text-white'}`}>
              {timeRemaining}s
            </motion.div>
          </div>
        </div>

        {/* Round title */}
        <motion.h3 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="font-display text-lg text-white/70 text-center mb-3">
          {currentRound.title}
        </motion.h3>

        {/* Main Image */}
        {!isIntruder && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full aspect-video rounded-2xl overflow-hidden mb-4 relative">
            {isFlash && flashExpired ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-white/30 text-lg font-display">Imagem oculta!</motion.p>
              </div>
            ) : (
              <ZoomableImage src={currentRound.image} alt="Round" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            <div className="absolute bottom-2 right-2 pointer-events-none">
              <span className="text-white/30 text-xs bg-black/40 px-2 py-1 rounded-lg">
                {isFlash ? 'Memorize!' : 'Pinça/arraste para zoom'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Intruder Grid */}
        {isIntruder && currentRound.intruderImages && (
          <>
            <p className="font-display text-center text-white/60 mb-3 text-sm">
              Encontre a imagem que não pertence ao grupo!
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {currentRound.intruderImages.map((img, idx) => {
                const isSelected = myAnswer === img.country;
                return (
                  <motion.button key={img.country}
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileTap={!answerRegistered ? { scale: 0.95 } : {}}
                    onClick={() => !answerRegistered && submitAnswer(img.country)}
                    disabled={answerRegistered}
                    className={`aspect-square rounded-2xl overflow-hidden relative transition-all duration-300
                      ${isSelected ? 'ring-4 ring-neon-blue glow-blue' : 'ring-2 ring-white/10'}
                      ${answerRegistered && !isSelected ? 'opacity-40' : ''}
                    `}>
                    <img src={img.image} alt="" className="w-full h-full object-cover" />
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {/* Options Grid */}
        {!isPrank && !isIntruder && !isConsensus && !isTrust && currentRound.options && (
          <>
            <p className="font-display text-center text-white/60 mb-3">
              {isTrueFalse ? 'Responda:' : isFlash ? 'O que você viu?' : 'Escolha a opção:'}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {currentRound.options.map((option, idx) => {
                const isSelected = myAnswer === option.label;
                return (
                  <motion.button key={option.label}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={!answerRegistered ? { scale: 1.03 } : {}}
                    whileTap={!answerRegistered ? { scale: 0.97 } : {}}
                    onClick={() => !answerRegistered && submitAnswer(option.label)}
                    disabled={answerRegistered}
                    className={`${isTrueFalse ? 'py-6' : 'py-4'} px-3 rounded-2xl font-display font-bold ${isTrueFalse ? 'text-xl' : 'text-base'}
                      flex items-center justify-center gap-2 transition-all duration-300
                      ${isSelected ? 'bg-neon-blue/30 ring-2 ring-neon-blue text-white glow-blue' : 'glass text-white hover:bg-white/10'}
                      ${answerRegistered && !isSelected ? 'opacity-40' : ''}
                    `}>
                    <span className={isTrueFalse ? 'text-2xl' : 'text-xl'}>{option.flag}</span>
                    <span>{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {/* Trust Mode - Initial Answer */}
        {isTrust && trustPhase === 'answer' && currentRound.options && (
          <>
            <p className="font-display text-center text-white/60 mb-3">
              Escolha sua resposta. Depois decidirá se tem certeza!
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {currentRound.options.map((option, idx) => {
                const isSelected = myAnswer === option.label;
                return (
                  <motion.button key={option.label}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={!answerRegistered ? { scale: 1.03 } : {}}
                    whileTap={!answerRegistered ? { scale: 0.97 } : {}}
                    onClick={() => {
                      if (!answerRegistered) {
                        setMyAnswer(option.label);
                        trustAnswer(option.label);
                        setAnswerRegistered(true);
                      }
                    }}
                    disabled={answerRegistered}
                    className={`py-4 px-3 rounded-2xl font-display font-bold text-base
                      flex items-center justify-center gap-2 transition-all duration-300
                      ${isSelected ? 'bg-neon-blue/30 ring-2 ring-neon-blue text-white glow-blue' : 'glass text-white hover:bg-white/10'}
                      ${answerRegistered && !isSelected ? 'opacity-40' : ''}
                    `}>
                    <span className="text-xl">{option.flag}</span>
                    <span>{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {/* Consensus Mode */}
        {isConsensus && currentRound.consensusOptions && consensusPhase === 'vote' && (
          <>
            <p className="font-display text-center text-white/60 mb-3">
              Vote sua resposta! O grupo vai ver os votos depois.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {currentRound.consensusOptions.map((option, idx) => {
                const isSelected = myAnswer === option.label;
                return (
                  <motion.button key={option.label}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileTap={!answerRegistered ? { scale: 0.97 } : {}}
                    onClick={() => {
                      if (!answerRegistered) {
                        setMyAnswer(option.label);
                        const socket = getSocket();
                        socket.emit('game:consensusVote', option.label);
                        setAnswerRegistered(true);
                      }
                    }}
                    disabled={answerRegistered}
                    className={`py-4 px-3 rounded-2xl font-display font-bold text-base
                      flex items-center justify-center gap-2 transition-all duration-300
                      ${isSelected ? 'bg-neon-blue/30 ring-2 ring-neon-blue text-white glow-blue' : 'glass text-white hover:bg-white/10'}
                      ${answerRegistered && !isSelected ? 'opacity-40' : ''}
                    `}>
                    <span className="text-xl">{option.flag}</span>
                    <span>{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {isConsensus && consensusPhase === 'reveal' && (
          <div className="w-full mb-4">
            <p className="font-display text-center text-neon-yellow mb-3 text-sm font-bold">
              📊 Opinião do Grupo
            </p>
            <div className="space-y-2">
              {consensusVotes.map((vote, idx) => (
                <motion.div key={vote.option}
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-white font-bold">{vote.option}</span>
                    <span className="font-display text-neon-yellow">{vote.percentage}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${vote.percentage}%` }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.5 }}
                      className="bg-neon-blue h-3 rounded-full" />
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-white/40 text-xs mt-2">Discuta com o grupo! O host vai liberar a segunda rodada de votos.</p>
          </div>
        )}

        {isConsensus && consensusPhase === 'revote' && (
          <>
            <p className="font-display text-center text-neon-orange mb-3 text-sm font-bold">
              🔄 Segunda chance! Mude ou mantenha sua resposta!
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {currentRound.consensusOptions?.map((option, idx) => {
                const isSelected = myAnswer === option.label;
                return (
                  <motion.button key={option.label}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    whileTap={!answerRegistered ? { scale: 0.97 } : {}}
                    onClick={() => {
                      if (!answerRegistered) {
                        setMyAnswer(option.label);
                        const socket = getSocket();
                        socket.emit('game:consensusFinalAnswer', option.label);
                        setAnswerRegistered(true);
                      }
                    }}
                    disabled={answerRegistered}
                    className={`py-4 px-3 rounded-2xl font-display font-bold text-base
                      flex items-center justify-center gap-2 transition-all duration-300
                      ${isSelected ? 'bg-neon-orange/30 ring-2 ring-neon-orange text-white' : 'glass text-white hover:bg-white/10'}
                      ${answerRegistered && !isSelected ? 'opacity-40' : ''}
                    `}>
                    <span className="text-xl">{option.flag}</span>
                    <span>{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {/* Trust Mode - Confirm Phase */}
        {isTrust && trustPhase === 'confirm' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
            <motion.div className="glass-strong rounded-3xl p-8 text-center max-w-sm w-full">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="text-6xl mb-4">🤔</motion.div>
              <h3 className="font-display text-3xl font-bold text-white mb-2">VOCÊ TEM CERTEZA?</h3>
              <p className="text-white/50 text-sm mb-6">
                Sua resposta: <span className="text-neon-blue font-bold">{myAnswer}</span>
              </p>
              <p className="text-neon-orange text-xs mb-4 font-display">
                ⚠️ Trocar custa -100 pontos!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    trustConfirm(true);
                    setAnswerRegistered(true);
                  }}
                  className="flex-1 py-4 rounded-2xl font-display font-bold text-lg bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all">
                  🔒 CONFIRMAR
                </button>
                <button
                  onClick={() => {
                    trustConfirm(false);
                    setMyAnswer(null);
                    setAnswerRegistered(false);
                  }}
                  className="flex-1 py-4 rounded-2xl font-display font-bold text-lg bg-neon-orange/20 text-neon-orange hover:bg-neon-orange/30 transition-all">
                  🔄 TROCAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Trust Mode - Hint Phase */}
        {isTrust && trustPhase === 'hint' && (
          <>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-4 mb-4 text-center">
              <p className="text-neon-yellow font-display font-bold text-sm mb-1">💡 NOVA PISTA</p>
              <p className="text-white/80 text-sm">{trustHint}</p>
            </motion.div>
            {myAnswer === null ? (
              <>
                <p className="font-display text-center text-neon-orange mb-3 text-sm font-bold">
                  🔄 Escolha sua nova resposta:
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {currentRound.options?.map((option, idx) => (
                    <motion.button key={option.label}
                      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        trustRevote(option.label);
                        setMyAnswer(option.label);
                        setAnswerRegistered(true);
                      }}
                      className="py-4 px-3 rounded-2xl font-display font-bold text-base
                        flex items-center justify-center gap-2 transition-all duration-300
                        glass text-white hover:bg-white/10">
                      <span className="text-xl">{option.flag}</span>
                      <span>{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-3 rounded-2xl font-display font-bold bg-white/5 text-white/50">
                Nova resposta registrada!
              </motion.div>
            )}
          </>
        )}

        {/* Prank message */}
        {isPrank && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-white/70 text-xl font-display mt-4">
            Prepare-se para a rodada decisiva!
          </motion.p>
        )}

        {/* Answer feedback */}
        <AnimatePresence>
          {answerRegistered && !isPrank && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="text-center py-3 rounded-2xl font-display font-bold bg-white/5 text-white/50">
              Resposta registrada!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Reveal ──
  if (room?.phase === 'reveal' || room?.phase === 'scoring') {
    const correctAnswer = currentRound?.correctAnswer;
    const correctFlag = currentRound?.correctFlag;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-6">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-white/50 text-lg mb-4 font-display">A resposta era...</motion.p>
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-7xl mb-4">{correctFlag}</motion.div>
        <motion.h2 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="font-display text-4xl font-bold text-white mb-6">{correctAnswer}</motion.h2>
        {myScoreChange && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
            className={`text-center py-4 px-8 rounded-2xl ${
              myScoreChange.delta >= 0 ? 'bg-neon-green/20' : 'bg-neon-pink/20'
            }`}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className={`font-display text-5xl font-bold ${
                myScoreChange.delta >= 0 ? 'text-neon-green' : 'text-neon-pink'
              }`}>
              {myScoreChange.delta >= 0 ? '+' : ''}{myScoreChange.delta}
            </motion.p>
            <p className="text-white/50 text-sm mt-1">Total: {myScoreChange.total}</p>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ── Ranking ──
  if (room?.phase === 'ranking') {
    const myRank = ranking.find(e => e.playerId === state.playerId);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-6">
        <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="font-display text-3xl font-bold gradient-text mb-6">🏆 Ranking</motion.h2>

        <div className="w-full max-w-sm space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {ranking.map((entry, idx) => {
            const isMe = entry.playerId === state.playerId;
            const canChallenge = !isMe && myRank && entry.score > myRank.score && !challengeSent;
            return (
              <motion.div key={entry.playerId || idx}
                initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-2xl ${
                  isMe ? 'bg-neon-blue/20 ring-2 ring-neon-blue' : 'glass'
                }`}>
                <span className="font-display text-lg font-bold text-white/50 w-8">
                  {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : `${entry.position}º`}
                </span>
                <span className="text-2xl">{entry.avatar}</span>
                <span className="font-display font-bold text-white flex-1">
                  {entry.name} {isMe ? '(Você)' : ''}
                  {room?.players.find(p => p.id === entry.playerId)?.hasShield && (
                    <span className="ml-1 text-neon-blue" title="Escudo ativo">🛡️</span>
                  )}
                </span>
                <span className="font-display text-lg font-bold text-neon-yellow">{entry.score}</span>
                {canChallenge && (
                  <button
                    onClick={() => {
                      setChallengeTarget(entry.playerId || null);
                      setChallengeSent(true);
                      challengePlayer(entry.playerId || '');
                    }}
                    className="ml-2 px-3 py-1 rounded-xl bg-neon-pink/20 text-neon-pink text-xs font-display font-bold hover:bg-neon-pink/30 transition-all">
                    ⚔️ Duelo
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Challenge sent */}
        <AnimatePresence>
          {challengeSent && challengeTarget && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 w-full max-w-sm">
              <div className="glass-strong rounded-2xl p-4 text-center">
                <p className="text-neon-pink font-display font-bold text-lg">
                  ⚔️ Desafiou {ranking.find(r => r.playerId === challengeTarget)?.name}!
                </p>
                <p className="text-white/40 text-xs mt-2">O duelo acontecerá no próximo round!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Power-ups */}
        {myStreak >= 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 w-full max-w-sm">
            <p className="text-white/40 text-xs text-center mb-2 font-display">PODERES DISPONÍVEIS</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {myStreak >= 3 && (() => {
                const target = ranking.find(e => e.playerId !== state.playerId && e.score > 0 && !room?.players.find(p => p.id === e.playerId)?.hasShield);
                const hasTarget = !!target;
                return (
                  <button
                    onClick={() => { if (target) usePowerUp('steal', target.playerId); }}
                    disabled={!hasTarget}
                    className={`px-3 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                      hasTarget ? 'bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30' : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}>
                    🗡️ Roubar {hasTarget ? `de ${target!.name}` : '(sem alvo)'} (3x streak)
                  </button>
                );
              })()}
              {myStreak >= 5 && (
                <button
                  onClick={() => usePowerUp('shield')}
                  className="px-3 py-2 rounded-xl bg-neon-blue/20 text-neon-blue text-xs font-display font-bold hover:bg-neon-blue/30 transition-all">
                  🛡️ Escudo (5x streak)
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Power-up notification */}
        <AnimatePresence>
          {powerUpNotification && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-2xl px-6 py-3 text-center">
              <p className="font-display font-bold text-neon-yellow">
                {powerUpNotification.type === 'steal' ? '🗡️' : '🛡️'} {powerUpNotification.from}
              </p>
              <p className="text-white/70 text-sm">{powerUpNotification.effect}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending challenge (received) */}
        <AnimatePresence>
          {pendingChallenge && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
              <motion.div className="glass-strong rounded-3xl p-8 text-center max-w-sm w-full">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="text-6xl mb-4">⚔️</motion.div>
                <p className="text-white/60 text-sm mb-2">Desafio de Duelo recebido!</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-4xl">{pendingChallenge.fromAvatar}</span>
                  <span className="font-display text-2xl font-bold text-white">{pendingChallenge.fromName}</span>
                </div>
                <p className="text-neon-pink font-display text-sm mb-6">
                  Atenção: Você (Desafiado) TERÁ QUE ACERTAR a resposta no próximo round para defender seus pontos!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      acceptChallenge(pendingChallenge.fromId);
                      setPendingChallenge(null);
                    }}
                    className="flex-1 py-3 rounded-2xl font-display font-bold text-lg bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all">
                    Aceitar
                  </button>
                  <button
                    onClick={() => setPendingChallenge(null)}
                    className="flex-1 py-3 rounded-2xl font-display font-bold text-lg glass text-white/60 transition-all">
                    Recusar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="mt-8 text-white/30 text-sm">Aguardando próxima rodada...</motion.p>
      </motion.div>
    );
  }

  // ── Prank — Underwater Final Round ──
  if (room?.phase === 'prank') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 via-cyan-950/80 to-black/90" />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-7xl mb-4 relative z-10">🌊</motion.div>
        <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="font-display text-4xl font-bold text-white mb-2 relative z-10 text-center">
          RODADA FINAL!
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-cyan-300 text-xl mb-6 font-display relative z-10 text-center">
          Última chance de virar o jogo!
        </motion.p>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 }}
          className="w-full aspect-video rounded-2xl overflow-hidden mb-6 relative z-10 shadow-xl">
          <img src="/img/prank-underwater.png" alt="Final Round" className="w-full h-full object-cover" />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-white/80 text-lg relative z-10 font-display text-center">
          Prepare-se para a rodada decisiva!
        </motion.p>
      </motion.div>
    );
  }

  // ── Game Over ──
  if (room?.phase === 'gameOver') {
    const myFinalRank = ranking.find(r => r.playerId === state.playerId);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-6">
        {champion && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-7xl mb-4">{champion.avatar}</motion.div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="font-display text-2xl text-white/50 mb-2">
              {champion.name === state.playerName ? 'Você venceu!' : `${champion.name} venceu!`}
            </motion.h2>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="font-display text-5xl font-bold gradient-text mb-8">{champion.score} PONTOS</motion.p>
          </>
        )}
        {myFinalRank && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            className="glass rounded-2xl p-6 text-center">
            <p className="text-white/50 mb-2">Sua posição</p>
            <p className="font-display text-4xl font-bold text-neon-blue">{myFinalRank.position}º lugar</p>
            <p className="font-display text-2xl font-bold text-neon-yellow mt-2">{myFinalRank.score} pontos</p>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ── Fallback ──
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-neon-blue rounded-full animate-spin" />
    </div>
  );
}
