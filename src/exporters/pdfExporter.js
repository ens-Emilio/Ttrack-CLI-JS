/**
 * PDF exporter using pdfkit (optional dependency).
 * Install: npm install pdfkit
 */
import { formatMsToDuration, formatDateTime, formatCurrency } from '../utils/formatter.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

function sumBillableAmount(sessions, cfg) {
  return sessions.reduce((sum, session) => {
    if (!session.billable) return sum;
    const rate = session.hourlyRate || cfg?.hourlyRate || 0;
    return sum + ((session.duration || 0) / 3600000) * rate;
  }, 0);
}

export async function exportToPdf(sessions, options, cfg) {
  let PDFDocument;
  try {
    const mod = await import('pdfkit');
    PDFDocument = mod.default;
  } catch {
    throw new AppError(
      ERROR_CODES.E_PDF_EXPORT_FAILED,
      'pdfkit não está instalado. Execute: npm install pdfkit'
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(18).text('Relatório de Atividades — ttrack-cli', { align: 'center' });
    doc.moveDown();

    // Summary
    const totalMs = sessions.reduce((s, x) => s + (x.duration || 0), 0);
    const totalEarnings = sumBillableAmount(sessions, cfg);
    const billableCount = sessions.filter(s => s.billable !== false).length;

    doc.fontSize(11)
      .text(`Total de Sessões: ${sessions.length}`)
      .text(`Sessões Faturáveis: ${billableCount}`)
      .text(`Duração Total: ${formatMsToDuration(totalMs)}`)
      .text(`Ganhos Estimados: ${formatCurrency(totalEarnings, cfg?.currency || 'BRL')}`);
    doc.moveDown();

    // Table header
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Tarefa', 50, doc.y, { continued: true, width: 150 })
      .text('Projeto', 200, doc.y, { continued: true, width: 120 })
      .text('Data', 320, doc.y, { continued: true, width: 100 })
      .text('Duração', 420, doc.y, { width: 80 });
    doc.font('Helvetica');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    for (const s of sessions) {
      doc.text(s.task.substring(0, 28), 50, doc.y, { continued: true, width: 150 })
        .text((s.project || '-').substring(0, 18), 200, doc.y, { continued: true, width: 120 })
        .text(formatDateTime(s.startTime, cfg), 320, doc.y, { continued: true, width: 100 })
        .text(formatMsToDuration(s.duration), 420, doc.y, { width: 80 });

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    doc.end();
  });
}

export async function writePdfToFile(outputPath, sessions, options, cfg) {
  const fs = await import('fs');
  const buffer = await exportToPdf(sessions, options, cfg);
  fs.default.writeFileSync(outputPath, buffer);
}
