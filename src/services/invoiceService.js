import { format, parseISO } from 'date-fns';
import { sessionRepository } from '../core/repositories/sessionRepository.js';
import { clientRepository } from '../core/repositories/clientRepository.js';
import { projectRepository } from '../core/repositories/projectRepository.js';
import { filterSessions } from './filterService.js';
import { formatCurrency, formatMsToDuration } from '../utils/formatter.js';
import { getConfig } from '../../config/manager.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

function escapeMarkdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|');
}

function nextInvoiceNumber() {
  const today = format(new Date(), 'yyyyMMdd');
  const seq = String(Date.now()).slice(-4);
  return `INV-${today}-${seq}`;
}

function buildProjectBreakdown(sessions, currency) {
  const grouped = new Map();

  for (const session of sessions) {
    const key = session.project || 'Sem Projeto';
    const current = grouped.get(key) || { project: key, hours: 0, amount: 0, sessions: 0 };
    current.hours += session.hours;
    current.amount += session.amount;
    current.sessions += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].map(item => ({
    ...item,
    amountStr: formatCurrency(item.amount, currency),
    hoursStr: `${item.hours.toFixed(2)}h`
  }));
}

export function generateInvoice(options) {
  const cfg = getConfig();
  const { clientName, from, to } = options;

  let client = null;
  if (clientName) {
    client = clientRepository.findByName(clientName);
    if (!client) {
      throw new AppError(ERROR_CODES.E_CLIENT_NOT_FOUND, `Cliente não encontrado: ${clientName}`);
    }
  }

  const allSessions = sessionRepository.getAll();
  const filters = { from, to };

  let sessions = filterSessions(allSessions, filters);

  if (client) {
    const projects = projectRepository.getAll().filter(p => p.clientId === client.id);
    const projectNames = new Set(projects.map(p => p.name));
    sessions = sessions.filter(s => s.project && projectNames.has(s.project));
  }

  const billableSessions = sessions.filter(s => s.billable !== false);
  const lineItems = billableSessions.map(s => {
    const rate = s.hourlyRate || cfg.hourlyRate || 0;
    const hours = (s.duration || 0) / 3600000;
    const amount = hours * rate;
    return { sessionId: s.id, rate, hours, amount };
  });
  const lineItemsBySessionId = Object.fromEntries(lineItems.map(item => [item.sessionId, item]));

  const totalMs = billableSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalHours = totalMs / 3600000;
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const projectBreakdown = buildProjectBreakdown(
    billableSessions.map(session => ({
      ...session,
      ...lineItemsBySessionId[session.id]
    })),
    cfg.currency
  );

  return {
    number: nextInvoiceNumber(),
    client,
    from: from || null,
    to: to || null,
    sessions: billableSessions,
    billableSessionCount: billableSessions.length,
    totalHours,
    totalAmount,
    currency: cfg.currency,
    lineItems,
    projectBreakdown,
    generatedAt: new Date().toISOString()
  };
}

export function renderInvoiceMarkdown(invoice, cfg = {}) {
  const currency = invoice.currency || 'BRL';
  const lines = [];

  lines.push(`# Fatura ${invoice.number}`);
  lines.push('');
  if (invoice.client) {
    lines.push(`**Cliente:** ${invoice.client.name}`);
  }
  if (invoice.from || invoice.to) {
    lines.push(`**Período:** ${invoice.from || '...'} → ${invoice.to || '...'}`);
  }
  lines.push(`**Gerada em:** ${format(parseISO(invoice.generatedAt), 'dd/MM/yyyy HH:mm')}`);
  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push(`- Sessões faturáveis: ${invoice.billableSessionCount ?? invoice.sessions.length}`);
  lines.push(`- Horas faturáveis: ${invoice.totalHours.toFixed(2)}h`);
  lines.push(`- Valor médio por hora: ${formatCurrency(invoice.totalHours > 0 ? invoice.totalAmount / invoice.totalHours : 0, currency)}`);
  lines.push('');
  lines.push('## Sessões');
  lines.push('');
  lines.push('| Tarefa | Projeto | Duração | Valor |');
  lines.push('|--------|---------|---------|-------|');

  for (const s of invoice.sessions) {
    const item = invoice.lineItems?.find(line => line.sessionId === s.id);
    const rate = item?.rate ?? (s.hourlyRate || 0);
    const amount = item?.amount ?? ((s.duration / 3600000) * rate);
    lines.push(
      `| ${escapeMarkdownCell(s.task)} | ${escapeMarkdownCell(s.project || '-')} | ${formatMsToDuration(s.duration)} | ${formatCurrency(amount, currency)} |`
    );
  }

  if (invoice.projectBreakdown?.length > 0) {
    lines.push('');
    lines.push('## Por Projeto');
    lines.push('');
    lines.push('| Projeto | Sessões | Horas | Valor |');
    lines.push('|---------|---------|-------|-------|');
    for (const item of invoice.projectBreakdown) {
      lines.push(`| ${escapeMarkdownCell(item.project)} | ${item.sessions} | ${item.hoursStr} | ${item.amountStr} |`);
    }
  }

  lines.push('');
  lines.push(`**Total de Horas:** ${invoice.totalHours.toFixed(2)}h`);
  lines.push(`**Total:** ${formatCurrency(invoice.totalAmount, currency)}`);

  return lines.join('\n');
}

function escapeCsvField(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function renderInvoiceCsv(invoice) {
  const currency = invoice.currency || 'BRL';
  const lines = [];

  lines.push([
    escapeCsvField(invoice.number),
    escapeCsvField(invoice.client?.name || ''),
    escapeCsvField(invoice.from || ''),
    escapeCsvField(invoice.to || ''),
    escapeCsvField(invoice.generatedAt),
    String(invoice.billableSessionCount),
    invoice.totalHours.toFixed(2),
    invoice.totalAmount.toFixed(2),
    escapeCsvField(currency)
  ].join(','));

  lines.push('');
  lines.push('task,project,start_time,end_time,duration_h,rate,amount,currency');

  for (const s of invoice.sessions) {
    const item = invoice.lineItems?.find(line => line.sessionId === s.id);
    const rate = item?.rate ?? (s.hourlyRate || 0);
    const amount = item?.amount ?? ((s.duration / 3600000) * rate);
    const hours = (s.duration / 3600000).toFixed(2);
    lines.push([
      escapeCsvField(s.task),
      escapeCsvField(s.project || ''),
      escapeCsvField(s.startTime),
      escapeCsvField(s.endTime || ''),
      hours,
      rate.toFixed(2),
      amount.toFixed(2),
      escapeCsvField(currency)
    ].join(','));
  }

  return lines.join('\n');
}

export function getInvoiceFormat(content, format) {
  if (format === 'csv') {
    return content;
  }
  return content;
}
