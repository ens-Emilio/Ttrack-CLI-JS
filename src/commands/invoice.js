import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as invoiceService from '../services/invoiceService.js';
import * as formatter from '../utils/formatter.js';
import { getConfig } from '../../config/manager.js';
import { writePdfToFile } from '../exporters/pdfExporter.js';

export default async function invoiceCommand(options) {
  const cfg = getConfig();
  const invoice = invoiceService.generateInvoice({
    clientName: options.client,
    from: options.from,
    to: options.to
  });

  if (invoice.sessions.length === 0) {
    console.log(chalk.yellow('Nenhuma sessao faturavel encontrada para os criterios informados.'));
    return;
  }

  const fmt = options.format || 'markdown';
  const ext = fmt === 'csv' ? 'csv' : fmt === 'pdf' ? 'pdf' : 'md';
  const outputName = options.output || `invoice-${invoice.number.replace(/^INV-/, '')}.${ext}`;

  if (fmt === 'pdf') {
    const filePath = path.resolve(process.cwd(), outputName);
    try {
      await writePdfToFile(filePath, invoice.sessions, options, cfg);
      console.log(chalk.green(`Fatura gerada: ${chalk.bold(outputName)}`));
    } catch (err) {
      console.log(chalk.red(`Erro ao gerar PDF: ${err.message}`));
    }
  } else if (fmt === 'csv') {
    const csv = invoiceService.renderInvoiceCsv(invoice);
    if (options.output) {
      const filePath = path.resolve(process.cwd(), outputName);
      fs.writeFileSync(filePath, csv);
      console.log(chalk.green(`Fatura gerada: ${chalk.bold(outputName)}`));
    } else {
      console.log(csv);
    }
  } else {
    const markdown = invoiceService.renderInvoiceMarkdown(invoice, cfg);
    if (options.output) {
      const filePath = path.resolve(process.cwd(), outputName);
      fs.writeFileSync(filePath, markdown);
      console.log(chalk.green(`Fatura gerada: ${chalk.bold(outputName)}`));
    } else {
      console.log(markdown);
    }
  }

  console.log(chalk.gray(`\nNumero: ${invoice.number} | Sessoes: ${invoice.billableSessionCount} | Total: ${formatter.formatCurrency(invoice.totalAmount, invoice.currency)}`));
}
