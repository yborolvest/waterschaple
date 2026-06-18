import type { Waterschap } from '../../data/waterschappen';

export interface WaterschapGuess {
  waterschap: Waterschap;
  distance: number;
  bearing: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
}

export interface WaterschapSerializedGuess {
  waterschapId: string;
  distance: number;
  bearing: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
}

export interface WaterschapTodayGame {
  date: string;
  puzzleNumber: number;
  targetId: string;
  guesses: WaterschapSerializedGuess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
}

export interface WaterschapPlayerStats {
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[];
  lastWinDate: string | null;
  lastPlayedDate: string | null;
  completedDates: string[];
  globalWinReportedDates: string[];
  history: {
    puzzleNumber: number;
    date: string;
    won: boolean;
    attempts: number | null;
    grid: string;
  }[];
  todayGame: WaterschapTodayGame | null;
}

export interface WaterschapGameState {
  target: Waterschap | null;
  guesses: WaterschapGuess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
  puzzleNumber: number;
  highlightedIndex: number;
  dateKey: string | null;
  stats: WaterschapPlayerStats | null;
  resultRecorded: boolean;
  globalSolveCount: number | null;
}
