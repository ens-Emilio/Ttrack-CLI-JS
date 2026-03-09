import { expect } from 'chai';
import * as calculator from '../src/core/calculator.js';

describe('Calculator', () => {
  it('deve calcular a duração correta entre duas datas em milissegundos', () => {
    const start = '2026-03-09T10:00:00.000Z';
    const end = '2026-03-09T10:30:00.000Z';
    const duration = calculator.calculateDuration(start, end);
    expect(duration).to.equal(30 * 60 * 1000); // 30 minutos
  });

  it('deve retornar 0 se as datas forem iguais', () => {
    const start = '2026-03-09T10:00:00.000Z';
    const duration = calculator.calculateDuration(start, start);
    expect(duration).to.equal(0);
  });
});
