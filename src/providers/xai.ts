import axios from 'axios';
import { BaseProvider, ChangelogInput } from './base';

export class XAIProvider extends BaseProvider {
  private baseURL = 'https://api.x.ai/v1';

  async generateChangelog(input: ChangelogInput): Promise<string> {
    const gitLog = input.commits
      .map(commit => `${commit.subject}${commit.body ? `\n${commit.body}` : ''}`)
      .join('\n\n');

    const prompt = `Generate a changelog entry in keep-a-changelog format for version ${input.version} based on this git log:

${gitLog}

Format it as:
## [${input.version}] - ${input.date}

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
        model: 'grok-3',
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
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
        message = axiosError.response?.data?.error?.message || 'API error';
      }
      throw new Error(`XAI API error: ${message}`);
    }
  }
}
