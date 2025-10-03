# AI Changelog Generator

An npm command line tool that generates changelogs in [Keep a Changelog](https://keepachangelog.com/) format using AI services (XAI or OpenAI).

## Features

- 🤖 **AI-Powered**: Uses XAI (default) or OpenAI to generate meaningful changelog entries
- 📝 **Keep a Changelog Format**: Generates changelogs following the standard format
- 🔍 **Dry Run Mode**: Test the output before writing to files
- 📁 **Flexible Output**: Create new files or append to existing changelogs
- 🔑 **Environment Variables**: Supports API keys from environment variables
- ⚡ **Simple CLI**: Easy-to-use command line interface with yargs

## Installation

```bash
npm install -g ai-changelog-generator
```

Or use locally in your project:

```bash
npm install ai-changelog-generator
npx ai-changelog
```

## Usage

### Basic Usage

```bash
# Generate changelog for version 1.2.0 (uses XAI by default)
ai-changelog -v 1.2.0

# Use OpenAI instead
ai-changelog -v 1.2.0 -p openai

# Dry run - see output without writing to file
ai-changelog -v 1.2.0 -d

# Append to existing changelog
ai-changelog -v 1.2.0 -a
```

### Advanced Usage

```bash
# Generate changelog for commits since a specific date
ai-changelog -v 1.2.0 -s "2024-01-01"

# Generate changelog for commits since 1 week ago
ai-changelog -v 1.2.0 -s "1 week ago"

# Specify custom output file
ai-changelog -v 1.2.0 -o MY_CHANGELOG.md

# Provide API key directly
ai-changelog -v 1.2.0 -k your-api-key-here
```

## API Keys

The tool requires API keys for the AI services. You can provide them in two ways:

### Environment Variables (Recommended)

For XAI (default):
```bash
export XAI_API_KEY="your-xai-api-key"
# or
export X_API_KEY="your-xai-api-key"
```

For OpenAI:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

### Command Line Option

```bash
ai-changelog -v 1.2.0 -k your-api-key-here
```

## Command Line Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--version` | `-v` | Version number for the changelog entry | Required |
| `--provider` | `-p` | AI provider (`xai` or `openai`) | `xai` |
| `--api-key` | `-k` | API key for the AI provider | From env vars |
| `--output` | `-o` | Output file path | `CHANGELOG.md` |
| `--dry-run` | `-d` | Print changelog without writing to file | `false` |
| `--append` | `-a` | Append to existing changelog | `false` |
| `--since` | `-s` | Generate changelog since this date | Last 10 commits |
| `--help` | `-h` | Show help | |

## Example Output

The tool generates changelogs in the standard Keep a Changelog format:

```markdown
## [1.2.0] - 2024-01-15

### Added
- New user authentication system
- Support for multiple file formats

### Changed
- Improved error handling in API requests
- Updated dependencies to latest versions

### Fixed
- Fixed memory leak in file processing
- Resolved issue with special characters in filenames

### Security
- Enhanced input validation
- Updated authentication tokens
```

## Requirements

- Node.js >= 14.0.0
- Git repository (the tool reads git log)
- API key for XAI or OpenAI

## License

MIT © Tantawowa