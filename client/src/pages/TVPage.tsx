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

export default function TVPage() {
  const {
    room, currentRound, timeRemaining, countdown,
    scoreChanges, ranking, champion,
    observeRoom, roundIntroIndex, consensusPhase, consensusVotes,
  } = useGame();

  const [lanIp, setLanIp] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [tvRoomCode, setTvRoomCode] = useState('');
  const [tvJoined, setTvJoined] = useState(false);
  const [tvError, setTvError] = useState('');

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(d => { if (d.ips?.[0]) setLanIp(d.ips[0]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]room=([A-Za-z0-9]+)/);
    if (match && !tvJoined) {
      const code = match[1].toUpperCase();
      setTvRoomCode(code);
      observeRoom(code);
      setTvJoined(true);
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    const host = window.location.hostname;
    const isTunnel = host.includes('trycloudflare.com') || host.includes('ngrok') || host.includes('loca.lt');
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    let qrHost = isTunnel ? host : (isLocalhost ? (lanIp || host) : host);
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = isTunnel ? 'https:' : window.location.protocol;
    const url = `${protocol}//${qrHost}${port}${window.location.pathname}#/join?room=${room.code}`;
    QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#0A0A1A', light: '#FFFFFF' } })
      .then(setQrDataUrl).catch(() => {});
  }, [room?.code, lanIp]);

  const handleTvJoin = () => {
    if (!tvRoomCode.trim() || tvRoomCode.trim().length < 4) { setTvError('Código muito curto'); return; }
    setTvError('');
    observeRoom(tvRoomCode.trim().toUpperCase());
    setTvJoined(true);
  };

  if (!room && !tvJoined) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <div className="text-[10rem] mb-6">🌍</div>
        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="font-display text-8xl font-bold gradient-text mb-4">NIGHT SLIDES</motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-white/40 text-2xl mb-12 font-display">Modo TV — Conecte à sala</motion.p>
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="glass-strong rounded-3xl p-8 flex flex-col items-center w-full max-w-sm">
          <p className="text-white/50 text-lg mb-4 font-display">Digite o código da sala</p>
          <input type="text" value={tvRoomCode}
            onChange={(e) => setTvRoomCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO" maxLength={6}
            className="w-full py-4 px-6 rounded-2xl text-center text-3xl font-display font-bold tracking-[0.3em] glass text-white placeholder-white/30 focus:outline-none focus:glow-blue transition-all duration-300 uppercase"
            autoFocus onKeyDown={(e) => e.key === 'Enter' && handleTvJoin()} />
          {tvError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neon-pink text-sm mt-3">{tvError}</motion.p>}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleTvJoin}
            className="mt-6 w-full py-4 rounded-2xl font-display font-bold text-lg bg-gradient-to-r from-neon-green to-neon-blue text-white glow-green transition-all duration-300">
            📺 Conectar à Sala
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  if (!room || room.phase === 'waiting') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8 relative">
        <div className="flex flex-col items-center justify-center gap-8 max-w-5xl w-full">
          <div className="glass-strong rounded-3xl p-10 flex flex-col items-center shadow-2xl">
            <h2 className="font-display text-4xl font-bold text-white mb-6">ENTRE PELO CELULAR</h2>
            <div className="bg-white rounded-3xl p-6 mb-6">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-[280px] h-[280px]" />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center text-black/40">Gerando QR Code...</div>
              )}
            </div>
            <p className="text-white/40 text-lg mb-1 font-display">Código da sala</p>
            <p className="font-display text-6xl font-bold text-neon-blue tracking-[0.3em] mb-4">{room?.code}</p>
          </div>

          {room && room.players.length > 0 && (
            <div className="w-full max-w-4xl">
              <p className="text-white/40 text-xl text-center mb-4 font-display">
                {room.players.length} jogador(es) na sala
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {room.players.map((p, idx) => (
                  <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.1 }}
                    className="glass rounded-2xl px-6 py-4 flex items-center gap-3">
                    <span className="text-3xl">{p.avatar}</span>
                    <span className="font-display font-bold text-2xl text-white">{p.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Round Intro ──
  if (room.phase === 'roundIntro' && currentRound) {
    const icon = ROUND_ICONS[currentRound.type] || '❓';
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <p className="text-white/40 text-3xl mb-4 font-display">
          RODADA {String(roundIntroIndex + 1).padStart(2, '0')}
        </p>
        <div className="text-[12rem] mb-6">{icon}</div>
        <h1 className="font-display text-7xl font-bold gradient-text mb-4 text-center">
          {currentRound.title}
        </h1>
        <p className="text-white/60 text-3xl mb-8 font-display">{currentRound.subtitle}</p>
        {currentRound.rules && (
          <div className="glass-strong rounded-3xl p-8 max-w-2xl text-center">
            <p className="text-white/80 text-2xl font-display leading-relaxed">{currentRound.rules}</p>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Countdown ──
  if (room.phase === 'countdown') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={`tv-cd-${countdown}`} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-[16rem] font-display font-bold gradient-text">
            {countdown > 0 ? countdown : 'GO!'}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Playing Phase ──
  if (room.phase === 'playing' && currentRound) {
    const answeredCount = room.players.filter(p => p.answer !== null).length;
    const isIntruder = currentRound.type === 'intruder';
    const isConsensus = currentRound.type === 'consensus';
    const isFlash = currentRound.type === 'flash';
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-between p-8 relative">
        <div className="text-center">
          <p className="font-display text-xl text-white/40">RODADA {String(room.currentRound + 1).padStart(2, '0')}</p>
          <h2 className="font-display text-4xl font-bold text-white mb-2">{currentRound.title}</h2>
        </div>

        {isConsensus && consensusPhase === 'reveal' && consensusVotes.length > 0 ? (
          <div className="w-full max-w-4xl my-4">
            <p className="font-display text-center text-neon-yellow mb-4 text-2xl font-bold">
              📊 Opinião do Grupo
            </p>
            <div className="space-y-4">
              {consensusVotes.map((vote, idx) => (
                <motion.div key={vote.option}
                  initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.15 }}
                  className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-2xl text-white font-bold">{vote.option}</span>
                    <span className="font-display text-2xl text-neon-yellow">{vote.percentage}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-5">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${vote.percentage}%` }}
                      transition={{ delay: 0.3 + idx * 0.15, duration: 0.6 }}
                      className="bg-neon-blue h-5 rounded-full" />
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-white/40 text-lg mt-4 font-display">Discutam! O host vai liberar a segunda votação.</p>
          </div>
        ) : isIntruder && currentRound.intruderImages ? (
          <div className="w-full max-w-6xl grid grid-cols-2 gap-4 my-4">
            {currentRound.intruderImages.map((img, idx) => (
              <motion.div key={img.country}
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="aspect-square rounded-3xl overflow-hidden relative ring-2 ring-white/10 shadow-2xl">
                <img src={img.image} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-6xl aspect-video rounded-3xl overflow-hidden relative shadow-2xl my-4">
            {isFlash && timeRemaining <= 0 ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <p className="text-white/30 text-3xl font-display">Imagem oculta!</p>
              </div>
            ) : (
              <>
                <img src={currentRound.image} alt="Round" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </>
            )}
            <div className="absolute bottom-6 right-8">
              <motion.div animate={timeRemaining <= 5 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
                className={`font-display text-7xl font-bold ${timeRemaining <= 5 ? 'text-neon-pink' : 'text-white'} drop-shadow-2xl`}>
                {timeRemaining}s
              </motion.div>
            </div>
          </div>
        )}

        {isIntruder && (
          <div className="my-4">
            <motion.div animate={timeRemaining <= 5 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeRemaining <= 5 ? Infinity : 0 }}
              className={`font-display text-7xl font-bold ${timeRemaining <= 5 ? 'text-neon-pink' : 'text-white'}`}>
              {timeRemaining}s
            </motion.div>
          </div>
        )}

        <div className="glass rounded-2xl px-8 py-4">
          <p className="text-white/60 text-xl font-display">
            Respostas: <span className="text-neon-green font-bold text-2xl">{answeredCount}</span> / {room.players.length}
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Reveal / Scoring ──
  if (room.phase === 'reveal' || room.phase === 'scoring') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <p className="text-white/50 text-3xl mb-6 font-display">A resposta era...</p>
        <div className="text-[10rem] mb-4">{currentRound?.correctFlag}</div>
        <h2 className="font-display text-7xl font-bold text-white mb-10">{currentRound?.correctAnswer}</h2>

        {scoreChanges.length > 0 && (
          <div className="w-full max-w-2xl space-y-4">
            {scoreChanges.map((sc, idx) => (
              <motion.div key={sc.playerId} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }} className="glass rounded-2xl p-5 flex items-center gap-5">
                <span className="text-4xl">{sc.avatar}</span>
                <span className="font-display font-bold text-2xl text-white flex-1">{sc.name}</span>
                <span className={`font-display text-3xl font-bold ${sc.delta >= 0 ? 'text-neon-green' : 'text-neon-pink'}`}>
                  {sc.delta >= 0 ? '+' : ''}{sc.delta}
                </span>
                <span className="text-white/40 text-lg font-display">→ {sc.total}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ── Ranking ──
  if (room.phase === 'ranking') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <h2 className="font-display text-7xl font-bold gradient-text mb-10">🏆 RANKING</h2>
        <div className="w-full max-w-3xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {ranking.map((entry, idx) => (
            <motion.div key={entry.playerId || idx} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.15 }}
              className={`flex items-center gap-6 p-5 rounded-3xl ${idx === 0 ? 'bg-neon-yellow/10 ring-2 ring-neon-yellow/30' : 'glass'}`}>
              <span className="font-display text-3xl font-bold text-white/50 w-16 text-center">
                {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : `${entry.position}º`}
              </span>
              <span className="text-5xl">{entry.avatar}</span>
              <span className="font-display text-3xl font-bold text-white flex-1">{entry.name}</span>
              <span className="font-display text-4xl font-bold text-neon-yellow">{entry.score} pts</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Prank — Underwater Final Round ──
  if (room.phase === 'prank') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 via-cyan-950/80 to-black/90" />
        <div className="text-[12rem] mb-2 relative z-10">🌊</div>
        <h1 className="font-display text-8xl font-bold text-white mb-2 relative z-10">RODADA FINAL!</h1>
        <p className="text-cyan-300 text-4xl mb-8 font-display relative z-10">Última chance de virar o jogo!</p>
        <div className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden relative z-10 shadow-2xl mb-8">
          <img src="/img/prank-underwater.png" alt="Final Round" className="w-full h-full object-cover" />
        </div>
        <p className="text-white/80 text-3xl font-display relative z-10 text-center">
          Prepare-se para a rodada decisiva!
        </p>
      </motion.div>
    );
  }

  // ── Game Over ──
  if (room.phase === 'gameOver') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-8">
        <h1 className="font-display text-7xl font-bold gradient-text mb-6">🎉 CAMPEÃO DO NIGHT SLIDES 🎉</h1>
        {champion && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
            className="glass-strong rounded-3xl p-10 flex flex-col items-center mb-8">
            <div className="text-[8rem] mb-4">{champion.avatar}</div>
            <h2 className="font-display text-5xl font-bold text-neon-yellow mb-2">{champion.name}</h2>
            <p className="font-display text-3xl text-white/70">{champion.score} PONTOS</p>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return null;
}
