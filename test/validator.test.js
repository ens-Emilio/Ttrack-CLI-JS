import { expect } from 'chai';
import * as validator from '../src/utils/validator.js';

describe('Validator', () => {
  describe('validateTaskName', () => {
    it('deve aceitar nomes de tarefas válidos', () => {
      expect(validator.validateTaskName('Desenvolvimento')).to.equal('Desenvolvimento');
      expect(validator.validateTaskName(' Tarefa com espaços ')).to.equal('Tarefa com espaços');
    });

    it('deve lançar erro para nomes vazios ou com apenas espaços', () => {
      expect(() => validator.validateTaskName('')).to.throw('O nome da tarefa não pode estar vazio.');
      expect(() => validator.validateTaskName('   ')).to.throw('O nome da tarefa não pode estar vazio.');
    });

    it('deve lançar erro para nomes muito longos', () => {
      const longName = 'a'.repeat(101);
      expect(() => validator.validateTaskName(longName)).to.throw('O nome da tarefa é muito longo');
    });
  });

  describe('validateDate', () => {
    it('deve validar datas no formato correto', () => {
      const date = validator.validateDate('2026-03-09');
      expect(date).to.be.an.instanceOf(Date);
      expect(date.toISOString()).to.include('2026-03-09');
    });

    it('deve lançar erro para formato de data inválido', () => {
      expect(() => validator.validateDate('data-invalida')).to.throw('Data inválida');
    });

    it('deve retornar null se não for fornecida uma data', () => {
      expect(validator.validateDate(null)).to.be.null;
    });
  });
});
