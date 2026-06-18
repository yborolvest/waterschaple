import { WATERSCHAPPEN, type Waterschap } from '../../data/waterschappen';
import { getDayIndex, getDayIndexFromKey, getYesterdayDateKey } from '../game-logic';

export function getWaterschapDailyTarget(date = new Date()): Waterschap {
  const dayIndex = getDayIndex(date);
  const index = ((dayIndex % WATERSCHAPPEN.length) + WATERSCHAPPEN.length) % WATERSCHAPPEN.length;
  return WATERSCHAPPEN[index];
}

export function getWaterschapDailyTargetFromKey(dateKey: string): Waterschap {
  const dayIndex = getDayIndexFromKey(dateKey);
  const index = ((dayIndex % WATERSCHAPPEN.length) + WATERSCHAPPEN.length) % WATERSCHAPPEN.length;
  return WATERSCHAPPEN[index];
}

export function getYesterdayWaterschapTarget(date = new Date()): Waterschap {
  return getWaterschapDailyTargetFromKey(getYesterdayDateKey(date));
}
