import { differenceInMilliseconds, parseISO } from 'date-fns';

/**
 * Calcula a duração total de uma sessão baseada em seus intervalos.
 * @param {Object} session Sessão com array de intervalos [{ startTime, endTime }].
 * @returns {number} Duração total em milisegundos.
 */
export function calculateTotalDuration(session) {
  if (!session.intervals || session.intervals.length === 0) {
    // Fallback para sessões legadas sem intervalos
    if (session.startTime && session.endTime) {
      return differenceInMilliseconds(parseISO(session.endTime), parseISO(session.startTime));
    }
    return 0;
  }

  return session.intervals.reduce((total, interval) => {
    const start = parseISO(interval.startTime);
    const end = interval.endTime ? parseISO(interval.endTime) : new Date();
    return total + Math.max(0, differenceInMilliseconds(end, start));
  }, 0);
}

/**
 * Calcula a duração em milissegundos entre duas datas ISO.
 */
export function calculateIntervalDuration(startTime, endTime) {
  const start = parseISO(startTime);
  const end = endTime ? parseISO(endTime) : new Date();
  return Math.max(0, differenceInMilliseconds(end, start));
}

/**
 * Compatibilidade com contratos antigos que chamam calculateDuration().
 */
export function calculateDuration(startTime, endTime) {
  return calculateIntervalDuration(startTime, endTime);
}
