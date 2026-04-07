import stringSimilarity from 'string-similarity';
import { getSessions } from './timerService.js';
import { parseISO, getHours } from 'date-fns';
import * as formatter from '../utils/formatter.js';

/**
 * AI Service for smarter task tracking.
 */

/**
 * Predicts project, tags and duration for a given task name based on history.
 * @param {string} taskName 
 */
export function predictSession(taskName) {
  const sessions = getSessions().filter(s => s.task && s.duration > 0);
  if (sessions.length === 0) return null;

  const tasks = sessions.map(s => s.task);
  const matches = stringSimilarity.findBestMatch(taskName, tasks);
  const bestMatch = matches.bestMatch;

  if (bestMatch.rating < 0.4) return null; // Too different

  const similarSessions = sessions.filter(s => s.task === bestMatch.target);
  
  // Calculate averages
  const totalDuration = similarSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const avgDuration = totalDuration / similarSessions.length;

  // Most frequent project
  const projectCounts = {};
  similarSessions.forEach(s => {
    if (s.project) projectCounts[s.project] = (projectCounts[s.project] || 0) + 1;
  });
  const bestProject = Object.entries(projectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Most frequent tags
  const tagCounts = {};
  similarSessions.forEach(s => {
    const tags = Array.isArray(s.tags) ? s.tags : (s.tags ? s.tags.split(',') : []);
    tags.forEach(t => {
      const clean = t.trim();
      if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
    });
  });
  const bestTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(t => t[0]);

  return {
    bestMatchTask: bestMatch.target,
    confidence: bestMatch.rating,
    suggestedProject: bestProject,
    suggestedTags: bestTags,
    avgDuration,
    avgDurationStr: formatter.formatMsToDuration(avgDuration)
  };
}

/**
 * Analyzes productivity by hour of the day.
 */
export function analyzeEfficiency() {
  const sessions = getSessions();
  const hourStats = Array(24).fill(0).map(() => ({ duration: 0, count: 0 }));

  sessions.forEach(s => {
    if (!s.startTime || !s.duration) return;
    const hour = getHours(parseISO(s.startTime));
    hourStats[hour].duration += s.duration;
    hourStats[hour].count += 1;
  });

  return hourStats.map((stats, hour) => ({
    hour,
    duration: stats.duration,
    count: stats.count,
    avgDuration: stats.count > 0 ? stats.duration / stats.count : 0
  }));
}
