export const HELP_EXAMPLES = `
Exemplos:
  ftt start "Implementar login" -p "Cliente X" -t auth,web
  ftt start "Bugfix" --template backend --github-issue 42
  ftt pause && ftt resume
  ftt stop
  ftt status
  ftt list --limit 10 --project "Site"
  ftt add "Reuniao" --start 09:00 --end 10:00 --date 2026-01-15 -p "Cliente Y"
  ftt report --month --group-by project --profitability
  ftt report --week --heatmap
  ftt report --compare last-month
  ftt export --format json --with-meta --month
  ftt export --format csv --project "Site" --billable --week
  ftt export --format pdf --output relatorio.pdf
  ftt import backup.csv --source csv
  ftt import toggl-data.csv --source toggl
  ftt import sessions.json --source json
  ftt invoice --client "Cliente X" --output fatura.md
  ftt invoice --from 2026-01-01 --to 2026-01-31
  ftt edit <id> --task "Novo nome" --project "Outro"
  ftt delete <id> --force
  ftt ui

Config:
  ftt config list              Lista toda a configuracao
  ftt config get hourlyRate    Mostra valor/hora atual
  ftt config set hourlyRate 120  Define valor/hora
  ftt config set currency USD  Define moeda
  ftt config set dailyGoal 6   Meta diaria em horas
  ftt config reset             Volta aos padroes
  ftt config path              Mostra caminho dos arquivos

Projetos:
  ftt project list                          Lista projetos
  ftt project set-rate "Site" 150           Define valor/hora
  ftt project set-budget "App" --hours 40   Define orcamento
  ftt project set-client "App" "Cliente X"  Vincula cliente
  ftt project delete "Velho"                Remove projeto

Clientes:
  ftt client add "Cliente X"    Adiciona cliente
  ftt client list               Lista clientes
  ftt client delete "Cliente X" Remove (se nao vinculado)

Templates:
  ftt template save backend --task "Backend work" -p API -t dev
  ftt template list            Lista templates
  ftt template show backend    Mostra detalhes
  ftt template delete backend  Remove template
  ftt start "Bugfix" --template backend  Usa template ao iniciar

TUI:
  ftt ui
  Teclas: [s] stop  [p] pause/resume  [e] exportar semana  [i] fatura  [q] sair

Dicas:
  Use --dry-run para simular qualquer operacao sem salvar
  Variaveis de ambiente: FTT_CURRENCY, FTT_HOURLY_RATE, FTT_DAILY_GOAL, FTT_TIMEZONE
  Completion: ftt completion --shell bash|zsh|fish
`;
