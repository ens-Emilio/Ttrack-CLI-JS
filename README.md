# ⏱️ TTrack CLI

> O Time Tracker de terminal definitivo, feito por e para freelancers e desenvolvedores.

![TTrack CLI Demo](https://via.placeholder.com/800x400.png?text=TTrack+CLI+Dashboard+ASCII)

O **TTrack CLI** (Freelancer Time Tracker) é uma ferramenta de linha de comando open-source para rastreamento de tempo, gestão de projetos, orçamentos, faturamento e análise de produtividade. Totalmente offline-first com SQLite, mas com poderes de nuvem!

## ✨ Funcionalidades Principais

*   **⚡ Rápido e Simples:** Inicie e pare timers com comandos curtos (`ftt s`, `ftt sp`).
*   **🧠 Start Inteligente (IA):** Auto-categorização e predição de duração baseada no seu histórico.
*   **📊 Dashboards no Terminal:** Gráficos ASCII, heatmaps de produtividade e análise de eficiência por hora.
*   **🎮 Gamificação:** Mantenha suas sequências (streaks) e desbloqueie conquistas de produtividade.
*   **🔄 Sync Bidirecional:** Sincronize nativamente com o **Toggl Track** e exporte para **Google Calendar** (ICS).
*   **🗄️ SQLite Embutido:** Storage robusto, rápido e confiável (migração automática de JSON legados).
*   **🤖 Automação e Webhooks:** Notificações automáticas no **Slack** e **Discord** ao iniciar/parar tarefas.
*   **💰 Faturamento:** Gere faturas em Markdown, PDF ou CSV automaticamente.
*   **🌐 API REST Local:** Exponha seus dados locais para integrações com ferramentas de terceiros.

---

## 🚀 Instalação

Certifique-se de ter o [Node.js](https://nodejs.org/) (v18+) instalado.

**Instalação Global (Recomendada):**
\`\`\`bash
npm install -g ttrack-cli
\`\`\`

**Executando localmente (Desenvolvimento):**
\`\`\`bash
git clone https://github.com/seu-usuario/ttrack-cli.git
cd ttrack-cli
npm install
npm link
\`\`\`

---

## 🎓 Tutorial Rápido (Quick Start)

### 1. Iniciar uma tarefa
Comece a trabalhar imediatamente. O TTrack vai adivinhar o projeto e as tags se você já fez isso antes!
\`\`\`bash
ftt start "Desenvolvimento da API" -p "Projeto X" -t "backend, api"
# Ou use o alias curto:
ftt s "Desenvolvimento da API"
\`\`\`

### 2. Pausar e Retomar
Vai tomar um café? 
\`\`\`bash
ftt pause  # ou ftt p
ftt resume # ou ftt res
\`\`\`

### 3. Parar e ver o Status
Verifique como está indo e finalize quando terminar:
\`\`\`bash
ftt status # ou ftt st
ftt stop   # ou ftt sp
\`\`\`

### 4. Veja seus resultados!
\`\`\`bash
ftt dashboard # Exibe o gráfico de horas dos últimos 14 dias
ftt report    # Relatório detalhado do dia/semana
ftt stats     # Veja seu "Streak" de dias trabalhados
\`\`\`

---

## 📚 Guia de Uso Completo

### ⏱️ Controle de Tempo
| Comando | Alias | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `start <tarefa>` | `s` | Inicia um timer | `ftt s "Bugfix" -p "App" -t urgent` |
| `stop` | `sp` | Para o timer ativo | `ftt sp` |
| `pause` | `p` | Pausa o timer | `ftt p` |
| `resume` | `res`| Retoma o timer | `ftt res` |
| `status` | `st` | Mostra o timer atual | `ftt st` |
| `add <tarefa>` | `a` | Adiciona sessão manual | `ftt a "Reunião" --start 10:00 --end 11:00` |
| `edit <id>` | `e` | Edita uma sessão | `ftt e 1234 --task "Novo Nome"` |
| `delete <id>` | `d` | Remove uma sessão | `ftt d 1234` |
| `list` | `l` | Lista histórico | `ftt l --limit 10` |

### 📊 Relatórios e Análises
| Comando | Descrição | Exemplo |
| :--- | :--- | :--- |
| `report` | Resumo de atividades | `ftt r --month --group-by project` |
| `report --heatmap` | Heatmap de intensidade | `ftt r --heatmap` |
| `report --efficiency`| Qual sua melhor hora do dia? | `ftt r --efficiency` |
| `dashboard` | Gráficos ASCII e Metas | `ftt dash` |
| `tags analyze` | Onde você gasta mais tempo? | `ftt t analyze` |

### 💰 Projetos e Faturamento
\`\`\`bash
# Configurar um projeto com valor/hora e orçamento (budget)
ftt project set-rate "Projeto X" 150
ftt project set-budget "Projeto X" --hours 40

# Gerar uma fatura para o cliente
ftt invoice --client "Cliente X" --format pdf --output fatura.pdf
\`\`\`

### 🎮 Gamificação
Torne o trabalho divertido!
\`\`\`bash
ftt stats        # Veja seu "Streak" (dias consecutivos)
ftt achievements # Veja troféus desbloqueados (ex: Night Owl, Maratonista)
\`\`\`

### ☁️ Integrações e Cloud
\`\`\`bash
# Sincronizar com o Toggl Track
ftt sync --provider toggl --token "SEU_TOGGL_API_TOKEN"

# Exportar para o Google Calendar (Gera um arquivo .ics)
ftt sync --provider ics

# Iniciar Servidor API REST Local (Para automações via HTTP)
ftt web --start-server --port 3000
\`\`\`

### 🔔 Slack & Discord Webhooks
O TTrack envia mensagens automáticas coloridas para o seu chat quando você inicia ou para uma tarefa.
\`\`\`bash
ftt config set webhookUrl "https://discord.com/api/webhooks/..."
# ou
ftt config set webhookUrl "https://hooks.slack.com/services/..."
\`\`\`

---

## ⚙️ Configurações Globais

Gerencie suas preferências com o comando `ftt config`:
\`\`\`bash
ftt config set hourlyRate 120    # Valor hora padrão
ftt config set currency "BRL"    # Moeda para relatórios
ftt config set dailyGoal 6       # Meta diária (6 horas)
ftt config set weeklyGoal 30     # Meta semanal
ftt config list                  # Ver todas as configurações
\`\`\`

---

## 💾 Banco de Dados & Backups

O TTrack usa **SQLite** localmente, garantindo performance extrema sem depender de internet.
Os dados ficam salvos em `~/.local/share/ttrack-cli/` (Linux), `AppData/Local/ttrack-cli` (Windows) ou `~/.config/ttrack-cli` (Mac).

**Fazer Backup Portátil (JSON):**
\`\`\`bash
ftt backup create --output ~/meus-backups/ttrack.json
\`\`\`

**Restaurar Backup:**
\`\`\`bash
ftt backup restore --file ~/meus-backups/ttrack.json
\`\`\`

---

## 🤝 Como Contribuir

Contribuições são muito bem-vindas! Se você quer adicionar uma nova integração, melhorar a IA de predição ou adicionar novos gráficos:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeatureIncrivel`)
3. Faça o commit das suas mudanças (`git commit -m 'Add: Minha nova feature'`)
4. Faça o push para a branch (`git push origin feature/MinhaFeatureIncrivel`)
5. Abra um Pull Request!

Certifique-se de rodar os testes antes de enviar:
\`\`\`bash
npm test
\`\`\`

## 📄 Licença

Distribuído sob a licença ISC. Veja \`LICENSE\` para mais informações.
