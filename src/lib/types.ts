export interface GemeentePublic {
  id: string;
  name: string;
  province: string;
}

export interface Guess {
  gemeente: GemeentePublic;
  distance: number;
  bearing: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
}

export interface HistoryEntry {
  puzzleNumber: number;
  date: string;
  won: boolean;
  attempts: number | null;
  grid: string;
}

export interface TodayGame {
  date: string;
  puzzleNumber: number;
  guesses: SerializedGuess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
  targetName?: string;
  targetProvince?: string;
  unlockedHints?: UnlockedHints;
}

export interface UnlockedHints {
  flagUrl: string | null;
  province: string | null;
}

export interface SerializedGuess {
  gemeenteId: string;
  gemeenteName: string;
  province: string;
  distance: number;
  bearing: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
}

export interface PlayerStats {
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[];
  lastWinDate: string | null;
  lastPlayedDate: string | null;
  completedDates: string[];
  globalWinReportedDates: string[];
  history: HistoryEntry[];
  todayGame: TodayGame | null;
}

export interface DailyMeta {
  puzzleNumber: number;
  dateKey: string;
  yesterday: GemeentePublic & { puzzleNumber: number };
  gemeenten: GemeentePublic[];
  globalSolveCount: number;
}

export interface GuessApiResponse {
  gemeente: GemeentePublic;
  distance: number;
  arrow: string;
  proximity: number;
  isCorrect: boolean;
  globalSolveCount: number;
  gemeenteHistoricalWins: number | null;
  target?: GemeentePublic;
  hints?: UnlockedHints;
}

export interface GameState {
  guesses: Guess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
  puzzleNumber: number;
  highlightedIndex: number;
  dateKey: string | null;
  stats: PlayerStats | null;
  resultRecorded: boolean;
  globalSolveCount: number | null;
  gemeenten: GemeentePublic[];
  targetName: string | null;
  targetProvince: string | null;
  yesterday: (GemeentePublic & { puzzleNumber: number }) | null;
  unlockedHints: UnlockedHints;
}
