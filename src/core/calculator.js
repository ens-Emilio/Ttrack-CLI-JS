import { differenceInMilliseconds } from 'date-fns';

export function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return differenceInMilliseconds(end, start);
}
