const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs-extra');
const path = require('path');
const OpenAI = require('openai');
const axios = require('axios');

// AI Service providers
class AIProvider {
  async generateChangelog(gitLog, version) {
    throw new Error('Not implemented');
  }
}

class XAIProvider extends AIProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1';
  }

  async generateChangelog(gitLog, version) {
    const prompt = `Generate a changelog entry in keep-a-changelog format for version ${version} based on this git log:

${gitLog}

Format it as:
## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- List new features

### Changed
- List changes in existing functionality

### Deprecated
- List soon-to-be removed features

### Removed
- List now removed features

### Fixed
- List any bug fixes

### Security
- List security improvements

Only include sections that have actual changes. Be concise and clear.`;

    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates changelogs in keep-a-changelog format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`XAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

class OpenAIProvider extends AIProvider {
  constructor(apiKey) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async generateChangelog(gitLog, version) {
    const prompt = `Generate a changelog entry in keep-a-changelog format for version ${version} based on this git log:

${gitLog}

Format it as:
## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- List new features

### Changed
- List changes in existing functionality

### Deprecated
- List soon-to-be removed features

### Removed
- List now removed features

### Fixed
- List any bug fixes

### Security
- List security improvements

Only include sections that have actual changes. Be concise and clear.`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates changelogs in keep-a-changelog format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

// Utility functions
async function getGitLog(since) {
  const { execSync } = require('child_process');
  try {
    const cmd = since 
      ? `git log --oneline --since="${since}"`
      : 'git log --oneline -10'; // Last 10 commits if no since date
    
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`Failed to get git log: ${error.message}`);
  }
}

async function createChangelogFile(content, outputFile) {
  const changelogHeader = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  
  const fullContent = changelogHeader + content;
  await fs.writeFile(outputFile, fullContent, 'utf8');
}

async function appendToChangelog(content, outputFile) {
  let existingContent = '';
  
  if (await fs.pathExists(outputFile)) {
    existingContent = await fs.readFile(outputFile, 'utf8');
  } else {
    // Create with header if file doesn't exist
    existingContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  }

  // Insert the new content after the header
  const lines = existingContent.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## [')) || lines.length;
  
  lines.splice(insertIndex, 0, '', content);
  
  await fs.writeFile(outputFile, lines.join('\n'), 'utf8');
}

async function generateChangelog() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('version', {
      alias: 'v',
      type: 'string',
      description: 'Version number for the changelog entry',
      demandOption: true
    })
    .option('provider', {
      alias: 'p',
      type: 'string',
      choices: ['xai', 'openai'],
      default: 'xai',
      description: 'AI provider to use for generating changelog'
    })
    .option('api-key', {
      alias: 'k',
      type: 'string',
      description: 'API key for the AI provider (can also use env vars)'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      default: 'CHANGELOG.md',
      description: 'Output file path'
    })
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      default: false,
      description: 'Print the generated changelog without writing to file'
    })
    .option('append', {
      alias: 'a',
      type: 'boolean',
      default: false,
      description: 'Append to existing changelog file instead of creating new'
    })
    .option('since', {
      alias: 's',
      type: 'string',
      description: 'Generate changelog since this date (e.g., "2024-01-01" or "1 week ago")'
    })
    .help()
    .alias('help', 'h')
    .example('$0 -v 1.2.0', 'Generate changelog for version 1.2.0')
    .example('$0 -v 1.2.0 -d', 'Dry run - print changelog without saving')
    .example('$0 -v 1.2.0 -a', 'Append to existing CHANGELOG.md')
    .example('$0 -v 1.2.0 -p openai', 'Use OpenAI instead of XAI')
    .example('$0 -v 1.2.0 -k your-api-key', 'Provide API key directly')
    .argv;

  try {
    // Get API key from argument or environment variable
    let apiKey = argv['api-key'];
    if (!apiKey) {
      if (argv.provider === 'xai') {
        apiKey = process.env.XAI_API_KEY || process.env.X_API_KEY;
      } else {
        apiKey = process.env.OPENAI_API_KEY;
      }
    }

    if (!apiKey) {
      console.error(`Error: API key required. Set ${argv.provider === 'xai' ? 'XAI_API_KEY' : 'OPENAI_API_KEY'} environment variable or use --api-key option.`);
      process.exit(1);
    }

    // Get git log
    console.log('Fetching git log...');
    const gitLog = await getGitLog(argv.since);
    
    if (!gitLog) {
      console.error('Error: No git commits found. Make sure you are in a git repository.');
      process.exit(1);
    }

    // Initialize AI provider
    console.log(`Using ${argv.provider.toUpperCase()} to generate changelog...`);
    let provider;
    if (argv.provider === 'xai') {
      provider = new XAIProvider(apiKey);
    } else {
      provider = new OpenAIProvider(apiKey);
    }

    // Generate changelog
    const changelog = await provider.generateChangelog(gitLog, argv.version);

    if (argv['dry-run']) {
      console.log('\n--- Generated Changelog (Dry Run) ---');
      console.log(changelog);
      console.log('\n--- End of Changelog ---');
    } else {
      if (argv.append) {
        await appendToChangelog(changelog, argv.output);
        console.log(`✅ Changelog appended to ${argv.output}`);
      } else {
        await createChangelogFile(changelog, argv.output);
        console.log(`✅ Changelog created at ${argv.output}`);
      }
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { generateChangelog };