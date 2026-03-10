# Freelance Time Tracker (ftt) ⏱️

Uma CLI prática e eficiente para freelancers que precisam rastrear o tempo gasto em projetos e gerar relatórios rápidos diretamente no terminal.

## 🚀 Funcionalidades

- **Rastreamento de Tempo**: Inicie e pare cronômetros de tarefas com suporte a projetos.
- **Relatórios Detalhados**: Visualize horas trabalhadas hoje, nesta semana ou no mês.
- **Exportação Flexível**: Exporte seus dados para JSON ou CSV para faturamento ou backup.
- **Interface Amigável**: Visual colorido e tabelas formatadas para facilitar a leitura.
- **Suporte a ES Modules**: Construído com as tecnologias mais modernas do ecossistema Node.js.

## 📦 Instalação

Clone o repositório e vincule o comando globalmente:

```bash
git clone https://github.com/ens-Emilio/ttrack-cli.git
cd ttrack-cli
npm install
npm link
```

## 🛠️ Comandos Disponíveis

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `ftt start <task>` | Inicia um novo cronômetro | `ftt start "Setup do projeto" -p "Cliente X"` |
| `ftt stop` | Para o cronômetro ativo | `ftt stop` |
| `ftt status` | Mostra o cronômetro atual | `ftt status` |
| `ftt list` | Lista as últimas sessões | `ftt list --limit 5` |
| `ftt report` | Gera relatórios de tempo | `ftt report --week` |
| `ftt export` | Exporta dados (json/csv) | `ftt export --format csv` |
| `ftt config` | Gerencia preferências do usuário | `ftt config set hourlyRate 150` |

### Opções de Filtro (Report e Export)
- `--today`: Apenas hoje.
- `--week`: Esta semana.
- `--month`: Este mês.
- `--from YYYY-MM-DD`: Data inicial customizada.
- `--to YYYY-MM-DD`: Data final customizada.

## 📁 Estrutura do Projeto

O projeto utiliza uma arquitetura modular baseada em serviços para separação de responsabilidades:

- **`bin/ftt.js`**: Ponto de entrada da CLI, utilizando `commander` e um wrapper de erro centralizado.
- **`src/services/`**: Camada de orquestração (Timer, Report, Export) que conecta os comandos à lógica de negócio.
- **`src/core/`**: Lógica central do domínio:
  - `storage.js`: Persistência atômica e segura em arquivos JSON.
  - `timer.js`: Máquina de estado para controle de sessões.
  - `calculator.js`: Cálculos de duração e faturamento.
- **`src/commands/`**: Implementação dos comandos CLI (list, start, stop, etc.).
- **`src/errors/`**: Tratamento de erros padronizado com códigos específicos.
- **`src/logger/`**: Sistema de logs estruturados direcionados para `stderr`.
- **`config/`**: Gerenciador de configurações do usuário (hourlyRate, currency, etc.).
- **`data/schema/`**: Definições de schema e lógica de migração automática.
- **`src/utils/`**: Utilitários para formatação de datas, moedas e validações.
- **`test/`**: Suíte de testes unitários com `node:test`.

## ⚙️ Configuração e Persistência

Os dados do usuário (sessões e configurações) são armazenados seguindo os padrões XDG/Home do sistema operacional:
- **Configuração**: `~/.config/ftt-cli/config.json` (ou equivalente).
- **Dados**: `~/.local/share/ftt-cli/sessions.json` (ou equivalente).
- **Legado**: O sistema migra automaticamente dados antigos de `./data/sessions.json` para o novo local no primeiro uso.

## 🧪 Testes

Para rodar a suíte de testes:

```bash
npm test
```

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE). Desenvolvido por **ens-Emilio**.
