import chalk from 'chalk';
import Table from 'cli-table3';
import { getSessions } from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';

export default function tagsAnalyzeCommand(options) {
  const sessions = getSessions();
  const tagStats = {};

  sessions.forEach(s => {
    if (!s.tags) return;
    const duration = s.duration || 0;
    
    let tagsArray = [];
    if (Array.isArray(s.tags)) {
      tagsArray = s.tags;
    } else if (typeof s.tags === 'string') {
      tagsArray = s.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    tagsArray.forEach(tag => {
      if (!tagStats[tag]) {
        tagStats[tag] = { duration: 0, count: 0 };
      }
      tagStats[tag].duration += duration;
      tagStats[tag].count += 1;
    });
  });

  const sortedTags = Object.entries(tagStats).sort((a, b) => b[1].duration - a[1].duration);

  if (sortedTags.length === 0) {
    console.log(chalk.yellow('Nenhuma tag encontrada no histórico.'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('Tag'), chalk.cyan('Sessões'), chalk.cyan('Tempo Total')],
    style: { head: [], border: [] }
  });

  sortedTags.forEach(([tag, stats]) => {
    table.push([
      tag,
      stats.count,
      formatter.formatMsToDuration(stats.duration)
    ]);
  });

  console.log(chalk.bold('\n📊 Análise de Tags\n'));
  console.log(table.toString());
}
