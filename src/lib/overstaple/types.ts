import type { StationPublic } from '../../data/stations';
import type { OverstapleMapData } from './logic';

export type { OverstapleMapData, MapPoint, MapSegment } from './logic';

export type GuessQuality = 'connected' | 'green' | 'orange' | 'red' | 'invalid';

export interface OverstapleRoute {
  start: StationPublic;
  end: StationPublic;
  /** Aantal tussenstations op kortste pad */
  intermediateCount: number;
}

export interface OverstapleGuess {
  station: StationPublic;
  quality: GuessQuality;
  /** NL: al eerder geraden / EN: duplicate guess */
  isDuplicate?: boolean;
}

export interface OverstapleSerializedGuess {
  stationId: string;
  stationName: string;
  province: string;
  quality: GuessQuality;
}

export interface OverstapleHistoryEntry {
  puzzleNumber: number;
  date: string;
  won: boolean;
  guesses: number | null;
  grid: string;
}

export interface OverstapleTodayGame {
  date: string;
  puzzleNumber: number;
  guesses: OverstapleSerializedGuess[];
  guessCount: number;
  gameOver: boolean;
  won: boolean;
  correctIds: string[];
  startName?: string;
  endName?: string;
}

export interface OverstaplePlayerStats {
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[];
  lastWinDate: string | null;
  lastPlayedDate: string | null;
  completedDates: string[];
  globalWinReportedDates: string[];
  history: OverstapleHistoryEntry[];
  todayGame: OverstapleTodayGame | null;
}

export interface OverstapleDailyMeta {
  puzzleNumber: number;
  dateKey: string;
  route: OverstapleRoute;
  map: OverstapleMapData;
  stations: StationPublic[];
  globalSolveCount: number;
  yesterday: {
    start: StationPublic;
    end: StationPublic;
    puzzleNumber: number;
  } | null;
}

export interface OverstapleGuessApiResponse {
  station: StationPublic;
  quality: GuessQuality;
  isDuplicate: boolean;
  globalSolveCount: number;
  gameOver: boolean;
  won: boolean;
  correctIds: string[];
  remaining: number;
  map: OverstapleMapData;
  solution?: {
    start: StationPublic;
    end: StationPublic;
    intermediate: StationPublic[];
  };
}

export interface OverstapleGameState {
  guesses: OverstapleGuess[];
  guessCount: number;
  gameOver: boolean;
  won: boolean;
  puzzleNumber: number;
  dateKey: string | null;
  stats: OverstaplePlayerStats | null;
  resultRecorded: boolean;
  globalSolveCount: number | null;
  stations: StationPublic[];
  route: OverstapleRoute | null;
  correctIds: string[];
  map: OverstapleMapData | null;
  yesterday: OverstapleDailyMeta['yesterday'] | null;
}
