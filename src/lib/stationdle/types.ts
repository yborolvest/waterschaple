import type { StationPublic } from '../../data/stations';

export interface StationUnlockedHints {
  province: string | null;
  traject: string | null;
}

export interface StationGuess {
  station: StationPublic;
  distance: number;
  bearing: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
}

export interface StationSerializedGuess {
  stationId: string;
  stationName: string;
  province: string;
  distance: number;
  bearing: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
}

export interface StationHistoryEntry {
  puzzleNumber: number;
  date: string;
  won: boolean;
  attempts: number | null;
  grid: string;
}

export interface StationTodayGame {
  date: string;
  puzzleNumber: number;
  targetId?: string;
  guesses: StationSerializedGuess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
  targetName?: string;
  targetProvince?: string;
  unlockedHints?: StationUnlockedHints;
}

export interface StationPlayerStats {
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[];
  lastWinDate: string | null;
  lastPlayedDate: string | null;
  completedDates: string[];
  globalWinReportedDates: string[];
  history: StationHistoryEntry[];
  todayGame: StationTodayGame | null;
}

export interface StationDailyMeta {
  puzzleNumber: number;
  dateKey: string;
  yesterday: StationPublic & { puzzleNumber: number };
  stations: StationPublic[];
  globalSolveCount: number;
}

export interface StationGuessApiResponse {
  station: StationPublic;
  distance: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
  globalSolveCount: number;
  stationHistoricalWins: number | null;
  target?: StationPublic;
  hints?: StationUnlockedHints;
}

export interface StationGameState {
  guesses: StationGuess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
  puzzleNumber: number;
  highlightedIndex: number;
  dateKey: string | null;
  stats: StationPlayerStats | null;
  resultRecorded: boolean;
  globalSolveCount: number | null;
  stations: StationPublic[];
  targetName: string | null;
  targetProvince: string | null;
  yesterday: (StationPublic & { puzzleNumber: number }) | null;
  unlockedHints: StationUnlockedHints;
}
