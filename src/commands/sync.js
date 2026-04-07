import chalk from 'chalk';
import { createEvents } from 'ics';
import fs from 'fs';
import path from 'path';
import { parseISO, format } from 'date-fns';
import { getSessions } from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';

export default function syncCommand(options) {
  if (options.provider === 'google-calendar' || options.provider === 'ics') {
    const sessions = getSessions();
    const events = [];

    sessions.forEach(s => {
      if (!s.startTime || !s.endTime) return;
      
      const start = parseISO(s.startTime);
      const end = parseISO(s.endTime);
      const durationMs = s.duration || 0;

      // ICS requires [year, month, date, hours, minutes]
      const startArr = [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes()
      ];
      
      const endArr = [
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes()
      ];

      events.push({
        start: startArr,
        end: endArr,
        title: s.task || 'Trabalho',
        description: `Projeto: ${s.project || 'Nenhum'}\nTags: ${s.tags || 'Nenhuma'}\nDuração: ${formatter.formatMsToDuration(durationMs)}`,
        status: 'CONFIRMED',
        busyStatus: 'BUSY'
      });
    });

    if (events.length === 0) {
      console.log(chalk.yellow('Nenhuma sessão finalizada encontrada para exportar.'));
      return;
    }

    createEvents(events, (error, value) => {
      if (error) {
        console.log(chalk.red(`Erro ao gerar ICS: ${error.message}`));
        return;
      }
      
      const filename = `ttrack-sync-${format(new Date(), 'yyyyMMdd-HHmmss')}.ics`;
      const filePath = path.resolve(process.cwd(), filename);
      fs.writeFileSync(filePath, value);
      
      console.log(chalk.green(`✅ Sucesso! Eventos salvos em ${chalk.bold(filename)}`));
      if (options.provider === 'google-calendar') {
        console.log(chalk.cyan('💡 Dica: Importe este arquivo ICS no seu Google Calendar.'));
      }
    });
  } else {
    console.log(chalk.yellow(`Provider "${options.provider}" não suportado. Tente "--provider ics" ou "--provider google-calendar".`));
  }
}
