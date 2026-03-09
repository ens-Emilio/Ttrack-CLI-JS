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

### Opções de Filtro (Report e Export)
- `--today`: Apenas hoje.
- `--week`: Esta semana.
- `--month`: Este mês.
- `--from YYYY-MM-DD`: Data inicial customizada.
- `--to YYYY-MM-DD`: Data final customizada.

## 📁 Estrutura do Projeto

- `bin/`: Ponto de entrada da CLI.
- `src/core/`: Lógica central (timer, armazenamento, cálculos).
- `src/commands/`: Implementação de cada comando da CLI.
- `src/utils/`: Utilitários de formatação e validação.
- `data/`: Local onde as sessões são armazenadas localmente em JSON.

## 🧪 Testes

Para rodar a suíte de testes:

```bash
npm test
```

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE). Desenvolvido por **ens-Emilio**.
