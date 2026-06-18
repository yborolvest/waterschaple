import type { Snelweg } from '../../data/snelwegen';



export interface SnelwegGuess {

  snelweg: Snelweg;

  distance: number;

  bearing: number;

  arrow: string;

  proximity: number;

  isCorrect: boolean;

}



export interface SnelwegSerializedGuess {

  snelwegId: string;

  distance: number;

  bearing: number;

  arrow: string;

  proximity: number;

  isCorrect: boolean;

}



export interface SnelwegdleTodayGame {

  date: string;

  puzzleNumber: number;

  targetId: string;

  guesses: SnelwegSerializedGuess[];

  attempts: number;

  gameOver: boolean;

  won: boolean;

}



export interface SnelwegdlePlayerStats {

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

  todayGame: SnelwegdleTodayGame | null;

}



export interface SnelwegdleGameState {

  target: Snelweg | null;

  guesses: SnelwegGuess[];

  attempts: number;

  gameOver: boolean;

  won: boolean;

  puzzleNumber: number;

  highlightedIndex: number;

  dateKey: string | null;

  stats: SnelwegdlePlayerStats | null;

  resultRecorded: boolean;

  globalSolveCount: number | null;

}


