import { parseISO, format, subDays, isSameDay, differenceInDays } from 'date-fns';
import { getSessions } from './timerService.js';

/**
 * Gamification Service for TTrack CLI.
 */

const ACHIEVEMENTS = [
  { id: 'early_bird', name: 'Early Bird', description: 'Iniciou uma tarefa antes das 07:00', icon: '🌅' },
  { id: 'night_owl', name: 'Night Owl', description: 'Trabalhou após as 23:00', icon: '🦉' },
  { id: 'marathoner', name: 'Maratonista', description: 'Uma única sessão com mais de 4 horas', icon: '🏃' },
  { id: 'consistent', name: 'Consistente', description: 'Trabalhou por 5 dias seguidos', icon: '📅' },
  { id: 'multitasker', name: 'Multitarefa', description: 'Trabalhou em 3 projetos diferentes no mesmo dia', icon: '🤹' },
  { id: 'prolific', name: 'Prolífico', description: 'Registrou mais de 10 horas em um único dia', icon: '🔥' }
];

export function getAchievements() {
  const sessions = getSessions().filter(s => s.duration > 0);
  const unlocked = new Set();
  const dayMap = {};

  sessions.forEach(s => {
    const start = parseISO(s.startTime);
    const end = s.endTime ? parseISO(s.endTime) : null;
    const day = format(start, 'yyyy-MM-dd');

    if (!dayMap[day]) dayMap[day] = { duration: 0, projects: new Set(), sessions: [] };
    dayMap[day].duration += s.duration;
    if (s.project) dayMap[day].projects.add(s.project);
    dayMap[day].sessions.push(s);

    // Early Bird
    if (start.getHours() < 7) unlocked.add('early_bird');
    
    // Night Owl
    if (end && (end.getHours() >= 23 || end.getHours() < 4)) unlocked.add('night_owl');

    // Marathoner
    if (s.duration > 4 * 3600000) unlocked.add('marathoner');
  });

  // Daily based achievements
  Object.values(dayMap).forEach(dayData => {
    if (dayData.projects.size >= 3) unlocked.add('multitasker');
    if (dayData.duration >= 10 * 3600000) unlocked.add('prolific');
  });

  // Streak Achievement
  const streak = calculateStreak();
  if (streak.current >= 5 || streak.max >= 5) unlocked.add('consistent');

  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.has(a.id)
  }));
}

export function calculateStreak() {
  const sessions = getSessions().filter(s => s.duration > 0);
  if (sessions.length === 0) return { current: 0, max: 0 };

  const uniqueDays = Array.from(new Set(
    sessions.map(s => format(parseISO(s.startTime), 'yyyy-MM-dd'))
  )).sort().reverse();

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Check if streak is still alive (worked today or yesterday)
  const isAlive = uniqueDays[0] === today || uniqueDays[0] === yesterday;

  if (isAlive) {
    let lastDate = parseISO(uniqueDays[0]);
    currentStreak = 1;
    
    for (let i = 1; i < uniqueDays.length; i++) {
      const currentDate = parseISO(uniqueDays[i]);
      if (differenceInDays(lastDate, currentDate) === 1) {
        currentStreak++;
        lastDate = currentDate;
      } else {
        break;
      }
    }
  }

  // Max Streak calculation
  let lastDate = null;
  uniqueDays.slice().reverse().forEach(dayStr => {
    const currentDate = parseISO(dayStr);
    if (!lastDate || differenceInDays(currentDate, lastDate) === 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    maxStreak = Math.max(maxStreak, tempStreak);
    lastDate = currentDate;
  });

  return { current: currentStreak, max: maxStreak };
}
