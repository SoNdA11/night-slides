import { RoundConfig } from './types';

export const GAME_ROUNDS: RoundConfig[] = [
  // ── RODADA 1: GUESS BASE (1x) ──
  {
    id: 1,
    type: 'guess',
    title: '🌍 ONDE ESTAMOS?',
    subtitle: 'Bem-vindo ao GeoGuessNight!',
    rules: 'Olhe a imagem e escolha o país correto. Simples assim!',
    image: '/img/round-01-ny.png',
    correctAnswer: 'EUA',
    correctFlag: '🇺🇸',
    options: [
      { label: 'EUA', flag: '🇺🇸' },
      { label: 'Itália', flag: '🇮🇹' },
      { label: 'França', flag: '🇫🇷' },
      { label: 'Brasil', flag: '🇧🇷' },
    ],
    timeLimit: 30,
    multiplier: 1,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 2: CONTINENTE (1x) ──
  {
    id: 2,
    type: 'guess',
    title: '🗺️ EM QUAL CONTINENTE?',
    subtitle: 'Identifique o continente da paisagem',
    rules: 'Em qual continente fica este lugar famoso?',
    image: '/img/round-02-roma.png',
    correctAnswer: 'Europa',
    correctFlag: '🇪🇺',
    options: [
      { label: 'Europa', flag: '🇪🇺' },
      { label: 'América do Norte', flag: '🌎' },
      { label: 'Ásia', flag: '🌏' },
      { label: 'África', flag: '🌍' },
    ],
    timeLimit: 25,
    multiplier: 1,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 3: OCEANO (1x) ──
  {
    id: 3,
    type: 'guess',
    title: '🌊 QUAL OCEANO BANHA?',
    subtitle: 'Conhecimento geográfico litorâneo',
    rules: 'Qual oceano banha as costas deste país asiático?',
    image: '/img/round-03-japan.png',
    correctAnswer: 'Oceano Pacífico',
    correctFlag: '🌊',
    options: [
      { label: 'Oceano Pacífico', flag: '🌊' },
      { label: 'Oceano Atlântico', flag: '🌊' },
      { label: 'Oceano Índico', flag: '🌊' },
      { label: 'Mar Mediterrâneo', flag: '🌊' },
    ],
    timeLimit: 25,
    multiplier: 1,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 4: VERDADEIRO OU FALSO (2x) ──
  {
    id: 4,
    type: 'truefalse',
    title: '✅ VERDADEIRO OU FALSO?',
    subtitle: 'A imagem não mente... ou mente?',
    rules: 'Esta imagem foi tirada no Reino Unido. Verdadeiro ou Falso?',
    image: '/img/round-04-uk.png',
    correctAnswer: 'Verdadeiro',
    correctFlag: '',
    options: [
      { label: 'Verdadeiro', flag: '✅' },
      { label: 'Falso', flag: '❌' },
    ],
    timeLimit: 20,
    multiplier: 2,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 5: INTRUSO (1x) ──
  {
    id: 5,
    type: 'intruder',
    title: '🧩 QUAL NÃO PERTENCE?',
    subtitle: 'Encontre o intruso entre as imagens',
    rules: '4 imagens aparecerão. 3 são da Ásia e 1 é da Europa. Encontre a que não pertence!',
    image: '/img/round-05-korea.png',
    correctAnswer: 'França',
    correctFlag: '🇫🇷',
    intruderImages: [
      { country: 'Coreia do Sul', image: '/img/round-05-korea.png' },
      { country: 'Taiwan', image: '/img/round-05-taiwan.png' },
      { country: 'Tailândia', image: '/img/round-05-thailand.png' },
      { country: 'França', image: '/img/round-05-france.png' },
    ],
    timeLimit: 40,
    multiplier: 1,
    scoringRule: { type: 'intruder' },
  },

  // ── RODADA 6: VELOCIDADE MÁXIMA (3x) ──
  {
    id: 6,
    type: 'guess',
    title: '⚡ VELOCIDADE MÁXIMA',
    subtitle: '15 segundos. Rápido!',
    rules: 'Tempo curto, pontos altos. Acerte rápido!',
    image: '/img/round-06-canada.png',
    correctAnswer: 'Canadá',
    correctFlag: '🇨🇦',
    options: [
      { label: 'Canadá', flag: '🇨🇦' },
      { label: 'EUA', flag: '🇺🇸' },
      { label: 'Groelândia', flag: '🇩🇰' },
      { label: 'Islândia', flag: '🇮🇸' },
    ],
    timeLimit: 15,
    multiplier: 3,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 7: QUAL O PAÍS? (2x) ──
  {
    id: 7,
    type: 'guess',
    title: '🔍 QUAL O PAÍS?',
    subtitle: 'Identifique este país europeu',
    rules: 'Olhe a imagem e descubra de qual país é esta paisagem!',
    image: '/img/round-07-romania.png',
    correctAnswer: 'Romênia',
    correctFlag: '🇷🇴',
    options: [
      { label: 'Romênia', flag: '🇷🇴' },
      { label: 'Bulgária', flag: '🇧🇬' },
      { label: 'Hungria', flag: '🇭🇺' },
      { label: 'Sérvia', flag: '🇷🇸' },
    ],
    timeLimit: 20,
    multiplier: 2,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 8: RUSH (3x) ──
  {
    id: 8,
    type: 'flash',
    title: '⚡ RUSH!',
    subtitle: '8 segundos. Sem erro!',
    rules: 'Olhe rápido! A imagem vai sumir. Identifique o país!',
    image: '/img/round-08-south-africa.png',
    correctAnswer: 'África do Sul',
    correctFlag: '🇿🇦',
    options: [
      { label: 'África do Sul', flag: '🇿🇦' },
      { label: 'Etiópia', flag: '🇪🇹' },
      { label: 'Nigéria', flag: '🇳🇬' },
      { label: 'Brasil', flag: '🇧🇷' },
    ],
    timeLimit: 20,
    flashDuration: 8,
    multiplier: 3,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 9: TUDO OU NADA (3x) ──
  {
    id: 9,
    type: 'guess',
    title: '💰 TUDO OU NADA',
    subtitle: 'Dobre ou nada!',
    rules: 'Se acertar, ganha 3x pontos. Se errar, nada!',
    image: '/img/round-09-ireland.png',
    correctAnswer: 'Irlanda',
    correctFlag: '🇮🇪',
    options: [
      { label: 'Irlanda', flag: '🇮🇪' },
      { label: 'Reino Unido', flag: '🇬🇧' },
      { label: 'Islândia', flag: '🇮🇸' },
      { label: 'Noruega', flag: '🇳🇴' },
    ],
    timeLimit: 20,
    multiplier: 3,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 10: IDIOMA / CULTURA (2x) ──
  {
    id: 10,
    type: 'guess',
    title: '🗣️ QUAL O IDIOMA OFICIAL?',
    subtitle: 'Cultura e geografia linguística',
    rules: 'Qual é o idioma oficial falado neste local histórico?',
    image: '/img/round-10-red-square.png',
    correctAnswer: 'Russo',
    correctFlag: '🇷🇺',
    options: [
      { label: 'Russo', flag: '🇷🇺' },
      { label: 'Polonês', flag: '🇵🇱' },
      { label: 'Alemão', flag: '🇩🇪' },
      { label: 'Ucraniano', flag: '🇺🇦' },
    ],
    timeLimit: 25,
    multiplier: 2,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 11: CONFIE OU MUDE (3x) ──
  {
    id: 11,
    type: 'trust',
    title: '🧠 CONFIE OU MUDE',
    subtitle: 'Você tem certeza?',
    rules: 'Escolha sua resposta. Depois decidirá: manter ou trocar? Trocar custa -100 pontos!',
    image: '/img/round-13-singapore.png',
    correctAnswer: 'Singapura',
    correctFlag: '🇸🇬',
    options: [
      { label: 'Singapura', flag: '🇸🇬' },
      { label: 'Hong Kong', flag: '🇭🇰' },
      { label: 'Dubai', flag: '🇦🇪' },
      { label: 'Tóquio', flag: '🇯🇵' },
    ],
    hint: 'Dica: A turnê "Deadline" da BLACKPINK aconteceu aqui em 2025.',
    timeLimit: 20,
    multiplier: 3,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 12: CAPITAL (3x) ──
  {
    id: 12,
    type: 'guess',
    title: '🏛️ QUAL A CAPITAL?',
    subtitle: 'Conhecimento de capitais do mundo',
    rules: 'Qual é a capital deste país europeu?',
    image: '/img/round-11-belgium.png',
    correctAnswer: 'Bruxelas',
    correctFlag: '🇧🇪',
    options: [
      { label: 'Bruxelas', flag: '🇧🇪' },
      { label: 'Amsterdam', flag: '🇳🇱' },
      { label: 'Luxemburgo', flag: '🇱🇺' },
      { label: 'Colônia', flag: '🇩🇪' },
    ],
    timeLimit: 45,
    multiplier: 3,
    scoringRule: { type: 'speed' },
  },

  // ── RODADA 13: PRANK (SUBAQUÁTICA) ──
  {
    id: 13,
    type: 'prank',
    title: '🌊 RODADA FINAL!',
    subtitle: 'Última chance de virar o jogo!',
    rules: 'Prepare-se para a rodada decisiva!',
    image: '/img/prank-underwater.png',
    correctAnswer: '',
    correctFlag: '',
    options: [],
    timeLimit: 10,
    multiplier: 0,
    scoringRule: { type: 'prank' },
    isPrank: true,
  },

  // ── RODADA 14: FINAL BOSS DECISIVO (3x) ──
  {
    id: 14,
    type: 'guess',
    title: '🎯 FINAL BOSS',
    subtitle: 'A verdadeira rodada decisiva!',
    rules: 'Última chance! Quem acertar leva 3x pontos e pode virar o jogo!',
    image: '/img/round-15-australia.png',
    correctAnswer: 'Austrália',
    correctFlag: '🇦🇺',
    options: [
      { label: 'Austrália', flag: '🇦🇺' },
      { label: 'Nova Zelândia', flag: '🇳🇿' },
      { label: 'Fiji', flag: '🇫🇯' },
      { label: 'Indonésia', flag: '🇮🇩' },
    ],
    timeLimit: 35,
    multiplier: 3,
    scoringRule: { type: 'speed' },
  },
];

export function getRoundById(rounds: RoundConfig[], id: number): RoundConfig | undefined {
  return rounds.find(r => r.id === id);
}

export function getRoundIndex(rounds: RoundConfig[], id: number): number {
  return rounds.findIndex(r => r.id === id);
}
