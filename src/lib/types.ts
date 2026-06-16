export interface Waterschap {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Guess {
  waterschap: Waterschap;
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
  targetId: string;
  guesses: SerializedGuess[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
}

export interface SerializedGuess {
  waterschapId: string;
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

export interface GameState {
  target: Waterschap | null;
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
}
