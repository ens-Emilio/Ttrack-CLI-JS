import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

/**
 * Filtra uma lista de sessões com base em critérios flexíveis.
 * @param {Array} sessions Lista original.
 * @param {Object} filters Critérios (project, tag, from, to, billable).
 */
export function filterSessions(sessions, filters = {}) {
  return sessions.filter(session => {
    // Filtro por Projeto
    if (filters.project && session.project !== filters.project) {
      return false;
    }

    // Filtro por Tag (se a sessão contém a tag solicitada)
    if (filters.tag && !session.tags?.includes(filters.tag)) {
      return false;
    }

    // Filtro por Faturável
    if (filters.billable !== undefined && session.billable !== filters.billable) {
      return false;
    }

    // Filtro por Data (Intervalo)
    if (filters.from || filters.to) {
      const sessionDate = parseISO(session.startTime);
      const start = filters.from ? startOfDay(parseISO(filters.from)) : new Date(0);
      const end = filters.to ? endOfDay(parseISO(filters.to)) : new Date(8640000000000000); // Max date

      try {
        if (!isWithinInterval(sessionDate, { start, end })) {
          return false;
        }
      } catch (e) {
        // Ignora datas inválidas nos filtros
        return true;
      }
    }

    return true;
  });
}
