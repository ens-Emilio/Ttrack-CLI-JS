import { expect } from 'chai';

import { AppError } from '../src/errors/AppError.js';
import { ERROR_CODES } from '../src/errors/codes.js';
import * as pdfExporter from '../src/exporters/pdfExporter.js';

describe('PDF exporter', () => {
  it('deve falhar com erro estável quando pdfkit não estiver disponível', async () => {
    try {
      await pdfExporter.exportToPdf([], {}, {});
      throw new Error('expected failure');
    } catch (err) {
      expect(err).to.be.instanceOf(AppError);
      expect(err.code).to.equal(ERROR_CODES.E_PDF_EXPORT_FAILED);
    }
  });
});
