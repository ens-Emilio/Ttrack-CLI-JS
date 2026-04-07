import { expect } from 'chai';
import completionCommand from '../src/commands/completion.js';

describe('Completion command', () => {
  it('deve gerar completion bash com subcomandos', () => {
    const output = captureStdout(() => completionCommand({ shell: 'bash' }));
    expect(output).to.include('config:list');
    expect(output).to.include('project:list');
    expect(output).to.include('client:add');
    expect(output).to.include('template:save');
    expect(output).to.include('backup:create');
    expect(output).to.include('cmd == "export"');
    expect(output).to.include('cmd == "invoice"');
    expect(output).to.include('cmd == "report"');
    expect(output).to.include('cmd == "start"');
  });

  it('deve gerar completion zsh', () => {
    const output = captureStdout(() => completionCommand({ shell: 'zsh' }));
    expect(output).to.include('config)');
    expect(output).to.include('project)');
    expect(output).to.include('client)');
    expect(output).to.include('template)');
  });

  it('deve gerar completion fish com subcomandos', () => {
    const output = captureStdout(() => completionCommand({ shell: 'fish' }));
    expect(output).to.include('subcommand_from config');
    expect(output).to.include('subcommand_from project');
    expect(output).to.include('subcommand_from template');
    expect(output).to.include('subcommand_from backup');
  });

  it('deve gerar completion fish com flags', () => {
    const output = captureStdout(() => completionCommand({ shell: 'fish' }));
    expect(output).to.include('--project');
    expect(output).to.include('--format');
    expect(output).to.include('-l help');
  });

  it('deve falhar com shell invalido', () => {
    let exitCode = 0;
    const orig = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };

    try {
      completionCommand({ shell: 'powershell' });
    } catch (e) {
      expect(e.message).to.equal('exit');
    } finally {
      process.exit = orig;
    }

    expect(exitCode).to.equal(2);
  });
});

function captureStdout(fn) {
  const chunks = [];
  const orig = process.stdout.write;
  process.stdout.write = (chunk) => { chunks.push(chunk); return true; };
  try {
    fn();
    return chunks.join('');
  } finally {
    process.stdout.write = orig;
  }
}
