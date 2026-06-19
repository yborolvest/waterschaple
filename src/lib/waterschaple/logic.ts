import { WATERSCHAPPEN, type Waterschap } from '../../data/waterschappen';
import { getDayIndex, getDayIndexFromKey, getYesterdayDateKey, getDailyListIndex } from '../game-logic';

export function getWaterschapDailyTarget(date = new Date()): Waterschap {
  const dayIndex = getDayIndex(date);
  const index = getDailyListIndex(dayIndex, WATERSCHAPPEN.length, 'waterschaple');
  return WATERSCHAPPEN[index];
}

export function getWaterschapDailyTargetFromKey(dateKey: string): Waterschap {
  const dayIndex = getDayIndexFromKey(dateKey);
  const index = getDailyListIndex(dayIndex, WATERSCHAPPEN.length, 'waterschaple');
  return WATERSCHAPPEN[index];
}

export function getYesterdayWaterschapTarget(date = new Date()): Waterschap {
  return getWaterschapDailyTargetFromKey(getYesterdayDateKey(date));
}
