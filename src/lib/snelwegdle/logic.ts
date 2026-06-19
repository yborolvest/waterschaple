import { SNELWEGEN, type Snelweg } from '../../data/snelwegen';

import { getDayIndex, getDayIndexFromKey, getYesterdayDateKey, getDailyListIndex } from '../game-logic';



export function getSnelwegDailyTarget(date = new Date()): Snelweg {

  const dayIndex = getDayIndex(date);

  const index = getDailyListIndex(dayIndex, SNELWEGEN.length, 'snelwegdle');

  return SNELWEGEN[index];

}



export function getSnelwegDailyTargetFromKey(dateKey: string): Snelweg {

  const dayIndex = getDayIndexFromKey(dateKey);

  const index = getDailyListIndex(dayIndex, SNELWEGEN.length, 'snelwegdle');

  return SNELWEGEN[index];

}



export function getYesterdaySnelwegTarget(date = new Date()): Snelweg {

  return getSnelwegDailyTargetFromKey(getYesterdayDateKey(date));

}


