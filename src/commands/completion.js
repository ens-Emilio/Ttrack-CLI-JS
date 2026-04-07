import chalk from 'chalk';

const COMMANDS = [
  'start', 'stop', 'pause', 'resume', 'status', 'list',
  'report', 'export', 'import', 'edit', 'delete', 'add',
  'project', 'client', 'invoice', 'template', 'ui', 'completion', 'config', 'backup'
];

const SUBCOMMANDS = {
  config: ['list', 'get', 'set', 'reset', 'path'],
  project: ['list', 'set-rate', 'set-budget', 'set-client', 'delete'],
  client: ['add', 'list', 'delete'],
  template: ['save', 'list', 'show', 'delete'],
  backup: ['create', 'restore']
};

const FLAGS_BY_COMMAND = {
  start: ['-p --project', '-t --tags', '-n --notes', '--billable --no-billable', '--hourly-rate', '--template', '--github-issue'],
  stop: [],
  pause: [],
  resume: [],
  status: [],
  list: ['-l --limit', '-p --project', '-t --tag', '--from --to'],
  add: ['--start', '--end', '--date', '-p --project', '-t --tags', '-n --notes', '--billable --no-billable', '--hourly-rate'],
  report: ['--today --week --month', '--from --to', '-p --project', '-t --tag', '--group-by', '--profitability', '--heatmap', '--compare'],
  export: ['--format', '--output', '-p --project', '-t --tag', '--billable --no-billable', '--with-meta', '--today --week --month', '--from --to'],
  'export --format': ['json', 'csv', 'pdf'],
  import: ['--source'],
  'import --source': ['json', 'csv', 'toggl'],
  edit: ['--task', '--project', '--tags', '--notes', '--start-time', '--end-time', '--hourly-rate', '--billable --no-billable'],
  delete: ['--force'],
  invoice: ['--client', '--from --to', '--output', '--format'],
  'invoice --format': ['markdown', 'csv', 'pdf'],
  ui: [],
  completion: ['--shell'],
  'completion --shell': ['bash', 'zsh', 'fish'],
  backup: [],
  'backup create': ['--output'],
  'backup restore': ['--file']
};

function generateBash() {
  const cmds = COMMANDS.join(' ');
  const subcmds = Object.entries(SUBCOMMANDS)
    .map(([cmd, subs]) => `${cmd}:${subs.join(' ')}`)
    .join('\n    ');

  const flagCases = Object.entries(FLAGS_BY_COMMAND)
    .map(([key, flags]) => {
      const [cmd, ...prev] = key.split(' ');
      const condition = prev.length
        ? `prev == "${prev.join(' ')}" && cmd == "${cmd}"`
        : `cmd == "${cmd}"`;
      return `    ${condition}) COMPREPLY=($(compgen -W "${flags.join(' ')}" -- "\${cur}")) ;;`;
    })
    .join('\n');

  return `# ttrack-cli bash completion
# Add to ~/.bashrc: source <(ftt completion --shell bash)
_ftt_completion() {
  local cur prev words cword
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cword=\${#COMP_WORDS[@]}

  local subcommands=(
    ${subcmds}
  )

  if [[ \${cword} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${cmds}" -- "\${cur}") )
    return 0
  fi

  local cmd="\${COMP_WORDS[1]}"

  # Subcommands for groups
  for entry in "\${subcommands[@]}"; do
    local subcmd="\${entry%%:*}"
    local subs="\${entry#*:}"
    if [[ "\${cmd}" == "\${subcmd}" && \${cword} -eq 2 ]]; then
      COMPREPLY=( $(compgen -W "\${subs}" -- "\${cur}") )
      return 0
    fi
  done

  # Flags
  local prev_flag="\${COMP_WORDS[COMP_CWORD-2]} \${COMP_WORDS[COMP_CWORD-1]}"
  case "\${prev_flag}" in
${flagCases}
  esac

  # General flags for subcommands
  if [[ "\${cword}" -ge 2 ]]; then
    local general_flags="--help --dry-run"
    COMPREPLY+=($(compgen -W "\${general_flags}" -- "\${cur}"))
  fi
}
complete -F _ftt_completion ftt
`;
}

function generateZsh() {
  const subGroups = Object.entries(SUBCOMMANDS)
    .map(([cmd, subs]) => {
      const subsDesc = subs.map(s => `'${s}:${cmd} ${s}'`).join('\n        ');
      return `      ${cmd})
        _describe '${cmd} subcommand' (
          ${subsDesc}
        )
        ;;`;
    })
    .join('\n');

  const flagArgs = Object.entries(FLAGS_BY_COMMAND)
    .map(([key, flags]) => {
      const parts = key.split(' ');
      const cmd = parts[0];
      const flagDescs = flags.map(f => {
        const [name, desc] = f.split(' ');
        return `'${name}[${desc || name}]'`;
      }).join('\n            ');
      return `    ${cmd})
      _arguments -S \\
        ${flagDescs}
      ;;`;
    })
    .join('\n');

  return `# ttrack-cli zsh completion
# Add to ~/.zshrc: source <(ftt completion --shell zsh)
_ftt() {
  local -a commands
  commands=(
    ${(COMMANDS.map(c => `'${c}'`).join('\n    '))}
  )

  local -a subcommands
  subcommands=(
${subGroups}
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  local cmd="\${words[2]}"

  case "\${cmd}" in
${flagArgs}
  esac

  for entry in "\${(@s.:.)subcommands}"; do
    # handled above
  done
}
compdef _ftt ftt
`;
}

function generateFish() {
  let out = '';
  for (const cmd of COMMANDS) {
    out += `complete -c ftt -f -a '${cmd}' -d 'ftt ${cmd}'\n`;
  }

  for (const [cmd, subs] of Object.entries(SUBCOMMANDS)) {
    for (const sub of subs) {
      out += `complete -c ftt -f -n '__fish_seen_subcommand_from ${cmd}' -a '${sub}' -d '${cmd} ${sub}'\n`;
    }
  }

  for (const [key, flags] of Object.entries(FLAGS_BY_COMMAND)) {
    if (!flags.length) continue;
    const parts = key.split(' ');
    let condition = '';
    if (parts.length === 1) {
      condition = `-n '__fish_seen_subcommand_from ${parts[0]}'`;
    } else {
      condition = `-n '__fish_seen_subcommand_from ${parts.join(' ')}'`;
    }
    for (const flag of flags) {
      const [name, desc] = flag.split(' ');
      out += `complete -c ftt ${condition} -l '${name.replace(/^--/, '')}' -d '${desc || name}'\n`;
      if (name.length === 2) {
        out += `complete -c ftt ${condition} -s '${name.replace(/^-/, '')}' -d '${desc || name}'\n`;
      }
    }
  }

  out += `complete -c ftt -f -l help -d 'Exibe ajuda'\n`;
  return out;
}

export default function completionCommand(options) {
  const shell = options.shell || 'bash';

  switch (shell) {
    case 'bash':
      process.stdout.write(generateBash());
      break;
    case 'zsh':
      process.stdout.write(generateZsh());
      break;
    case 'fish':
      process.stdout.write(generateFish());
      break;
    default:
      console.error(chalk.red(`Shell nao suportado: ${shell}. Use: bash, zsh, fish`));
      process.exit(2);
  }
}
