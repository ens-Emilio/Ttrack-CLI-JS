import { expect } from 'chai';

import { HELP_EXAMPLES } from '../src/constants/help.js';

describe('CLI help', () => {
  it('deve expor exemplos rapidos e comandos principais', () => {
    expect(HELP_EXAMPLES).to.include('Exemplos:');
    expect(HELP_EXAMPLES).to.include('ftt start "Implementar login"');
    expect(HELP_EXAMPLES).to.include('ftt report --month --group-by project --profitability');
    expect(HELP_EXAMPLES).to.include('ftt invoice --client "Cliente X" --output fatura.md');
  });

  it('deve ter exemplos por grupo de comando', () => {
    expect(HELP_EXAMPLES).to.include('Config:');
    expect(HELP_EXAMPLES).to.include('ftt config list');
    expect(HELP_EXAMPLES).to.include('ftt config get hourlyRate');
    expect(HELP_EXAMPLES).to.include('ftt config set hourlyRate');

    expect(HELP_EXAMPLES).to.include('Projetos:');
    expect(HELP_EXAMPLES).to.include('ftt project list');
    expect(HELP_EXAMPLES).to.include('ftt project set-rate');
    expect(HELP_EXAMPLES).to.include('ftt project set-budget');

    expect(HELP_EXAMPLES).to.include('Clientes:');
    expect(HELP_EXAMPLES).to.include('ftt client add');

    expect(HELP_EXAMPLES).to.include('Templates:');
    expect(HELP_EXAMPLES).to.include('ftt template save');
    expect(HELP_EXAMPLES).to.include('ftt template list');
  });

  it('deve ter exemplos de TUI com atalhos', () => {
    expect(HELP_EXAMPLES).to.include('TUI:');
    expect(HELP_EXAMPLES).to.include('[e] exportar');
    expect(HELP_EXAMPLES).to.include('[i] fatura');
  });

  it('deve ter exemplos de export e invoice avancados', () => {
    expect(HELP_EXAMPLES).to.include('ftt export --format csv');
    expect(HELP_EXAMPLES).to.include('ftt export --format pdf');
    expect(HELP_EXAMPLES).to.include('ftt import toggl-data.csv --source toggl');
    expect(HELP_EXAMPLES).to.include('ftt report --compare last-month');
  });

  it('deve ter dicas uteis', () => {
    expect(HELP_EXAMPLES).to.include('--dry-run');
    expect(HELP_EXAMPLES).to.include('FTT_CURRENCY');
    expect(HELP_EXAMPLES).to.include('Completion:');
  });
});
