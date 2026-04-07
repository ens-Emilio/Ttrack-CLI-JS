import { execSync } from 'child_process';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

export function resolveRepoFromGit() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

export function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export function getLastCommit(short = true) {
  try {
    const fmt = short ? '%h' : '%H';
    return execSync(`git log -1 --format=${fmt}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export function getCommitMessage() {
  try {
    return execSync('git log -1 --format=%s', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

export async function fetchIssueTitle(owner, repo, issueNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ttrack-cli'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new AppError(
      ERROR_CODES.E_GITHUB_API_ERROR,
      `GitHub API retornou ${res.status} para issue #${issueNumber}`,
      { url, status: res.status }
    );
  }

  const data = await res.json();
  return data.title;
}

export async function fetchPRInfo(owner, repo, prNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ttrack-cli'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new AppError(
      ERROR_CODES.E_GITHUB_API_ERROR,
      `GitHub API retornou ${res.status} para PR #${prNumber}`,
      { url, status: res.status }
    );
  }

  const data = await res.json();
  return {
    number: data.number,
    title: data.title,
    state: data.state,
    merged: data.merged,
    headBranch: data.head?.ref || null,
    baseBranch: data.base?.ref || null,
    url: data.html_url
  };
}

export function buildSessionGithubContext(options = {}) {
  const repo = resolveRepoFromGit();
  if (!repo) return null;

  return {
    repo: `${repo.owner}/${repo.repo}`,
    branch: getCurrentBranch(),
    lastCommit: getLastCommit(true),
    lastCommitFull: getLastCommit(false),
    commitMessage: getCommitMessage(),
    issueNumber: options.issueNumber || null
  };
}
