#!/usr/bin/env node
/* eslint-disable no-undef */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { OpenAIProvider } from './providers/openai';
import { XAIProvider } from './providers/xai';
import { BaseProvider, Commit } from './providers/base';

function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getLastTag(): string {
  try {
    // Prefer version-style tags (vX.Y.Z or vX.Y.Z-rc.N); fall back if needed
    return sh('git describe --tags --abbrev=0');
  } catch {
    return ''; // no tags yet
  }
}

function getPackageInfo(): { version: string; name?: string } | null {
  try {
    const pkgPath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return {
      version: pkg.version,
      name: pkg.name
    };
  } catch {
    return null;
  }
}

function flag(name: string, args: string[]): string | boolean | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : undefined;
}

function showUsage(): void {
  console.log(`
Usage: ai-changelog [options]

Options:
  --from <ref>          Start reference (default: last tag or HEAD)
  --to <ref>            End reference (default: HEAD)
  --write               Write to CHANGELOG.md
  --out <file>          Output to specific file
  --dry-run             Show preview without writing
  --provider <name>     AI provider: openai, xai (default: xai)
  --help                Show this help

Environment Variables:
  OPENAI_API_KEY        Required for OpenAI provider
  XAI_API_KEY           Required for XAI provider

Examples:
  ai-changelog --dry-run
  ai-changelog --from v1.0.0 --write
  ai-changelog --provider openai --out RELEASE_NOTES.md
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }

  const fromRef = flag('--from', args) as string || getLastTag();
  const toRef = flag('--to', args) as string || 'HEAD';
  const write = Boolean(flag('--write', args));
  const outPath = flag('--out', args) as string;
  const dryRun = Boolean(flag('--dry-run', args));
  const providerName = flag('--provider', args) as string || 'xai';

  const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');
  const range = fromRef ? `${fromRef}..${toRef}` : toRef;

  // Get package info
  const pkg = getPackageInfo();
  if (!pkg) {
    console.error('❌ No package.json found in current directory');
    console.error('Please run this command from a Node.js project root');
    process.exit(1);
  }

  const version = pkg.version;
  const today = new Date().toISOString().slice(0, 10);

  console.log(`📦 Project: ${pkg.name || 'unknown'}`);
  console.log(`🏷️  Version: ${version}`);
  console.log(`📅 Date: ${today}`);
  console.log(`🔖 Range: ${range}`);

  // Collect commits
  let raw: string;
  try {
    raw = sh(
      `git log --no-merges --date=iso-strict --pretty=format:%H%x1f%ad%x1f%s%x1f%b%x1e ${range}`
    );
  } catch (error: any) {
    console.error('❌ Failed to get git log. Are you in a git repository?');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  const commits: Commit[] = raw
    .split('\x1e')
    .filter(Boolean)
    .map((line) => {
      const [hash, date, subject, body] = line.split('\x1f');
      return { hash, date, subject: subject?.trim() || '', body: (body || '').trim() };
    });

  if (commits.length === 0) {
    console.error('❌ No commits found in the specified range');
    process.exit(1);
  }

  console.log(`📝 Found ${commits.length} commits`);

  // Initialize provider
  let provider: BaseProvider;
  try {
    switch (providerName) {
      case 'openai':
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          console.error('❌ Missing OPENAI_API_KEY environment variable');
          process.exit(1);
        }
        provider = new OpenAIProvider(openaiKey);
        break;

      case 'xai':
        const xaiKey = process.env.XAI_API_KEY || process.env.GITHUB_TOKEN;
        if (!xaiKey) {
          console.error('❌ Missing XAI_API_KEY or GITHUB_TOKEN environment variable');
          console.error('   Please set the XAI_API_KEY environment variable');
          process.exit(1);
        }
        provider = new XAIProvider(xaiKey);
        break;

      default:
        console.error(`❌ Unknown provider: ${providerName}`);
        console.error('Available providers: openai, xai');
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Failed to initialize ${providerName} provider: ${error.message}`);
    process.exit(1);
  }

  console.log(`🤖 Generating changelog with ${providerName}...`);

  const input = {
    version,
    date: today,
    commits: commits.map(({ subject, body }) => ({ subject, body })),
  };

  let generated: string;
  try {
    generated = await provider.generateChangelog(input);
  } catch (error: any) {
    console.error(`❌ Failed to generate changelog: ${error.message}`);
    process.exit(1);
  }

  if (!generated.trim()) {
    console.error('❌ Generated changelog is empty');
    process.exit(1);
  }

  if (write) {
    let newContent: string;

    if (existsSync(changelogPath)) {
      const existing = readFileSync(changelogPath, 'utf8');

      if (/^#\s*Changelog/m.test(existing)) {
        // Prepend after the H1 header if present
        const parts = existing.split(/^#\s*Changelog\s*$/m);
        if (parts.length > 1) {
          newContent = `# Changelog\n\n${generated}\n\n${parts[1].trimStart()}\n`;
        } else {
          newContent = `${generated}\n\n${existing}`;
        }
      } else {
        // Prepend to existing content
        newContent = `${generated}\n\n${existing}`;
      }
    } else {
      // Create a new changelog with header
      newContent = `# Changelog\n\n${generated}\n`;
    }

    try {
      writeFileSync(changelogPath, newContent);
      console.info(`✅ Wrote ${changelogPath} with ${version}`);
    } catch (error: any) {
      console.error(`❌ Failed to write changelog: ${error.message}`);
      process.exit(1);
    }
  }

  if (outPath) {
    const abs = resolve(process.cwd(), outPath);
    try {
      writeFileSync(abs, generated + '\n');
      console.info(`✅ Wrote ${abs}`);
    } catch (error: any) {
      console.error(`❌ Failed to write output file: ${error.message}`);
      process.exit(1);
    }
  }

  if (!write && !outPath) {
    console.log('----- BEGIN CHANGELOG PREVIEW -----');
    console.log(generated);
    console.log('----- END CHANGELOG PREVIEW -----');
  }
}

main().catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
