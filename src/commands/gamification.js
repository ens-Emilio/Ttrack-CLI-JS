import chalk from 'chalk';
import Table from 'cli-table3';
import { calculateStreak, getAchievements } from '../services/gamificationService.js';

export function statsCommand(options) {
  const streak = calculateStreak();
  
  console.log(chalk.bold.cyan('\n🔥 Suas Estatísticas\n'));
  console.log(`${chalk.bold('Streak Atual:')} ${streak.current} dias`);
  console.log(`${chalk.bold('Recorde (Max):')} ${streak.max} dias`);
  
  if (streak.current > 0) {
    console.log(chalk.yellow(`\nVocê está em chamas! Continue assim por mais ${5 - (streak.current % 5)} dias para subir o nível.`));
  } else {
    console.log(chalk.gray('\nInicie uma tarefa hoje para começar sua sequência!'));
  }
}

export function achievementsCommand() {
  const achievements = getAchievements();
  
  console.log(chalk.bold.cyan('\n🏆 Conquistas Desbloqueadas\n'));
  
  achievements.forEach(a => {
    const status = a.unlocked ? chalk.green('✔ [DESBLOQUEADO]') : chalk.gray('✘ [BLOQUEADO]');
    const color = a.unlocked ? chalk.white : chalk.gray;
    const icon = a.unlocked ? a.icon : '🔒';
    
    console.log(`${icon} ${color.bold(a.name)} - ${status}`);
    console.log(`   ${chalk.gray(a.description)}\n`);
  });
}
