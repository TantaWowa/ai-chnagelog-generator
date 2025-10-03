import OpenAI from 'openai';
import { BaseProvider, ChangelogInput } from './base';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
  }

  async generateChangelog(input: ChangelogInput): Promise<string> {
    const instructions = [
      'You generate concise release notes from git commits.',
      'Output ONLY a Markdown section for Keep a Changelog format:',
      `## [${input.version}] - ${input.date}`,
      '',
      'Group by: Added, Changed, Fixed, Deprecated, Removed, Security, Performance, Docs, Build/CI.',
      'Infer groups from Conventional Commits when possible (feat, fix, perf, docs, chore, refactor, build, ci).',
      'If nothing fits, put under Changed.',
      'If a commit includes BREAKING CHANGE (footer or bang), add a bold **BREAKING** subsection at the top with bullet points.',
      'Use short, user-facing phrasing. Prefer imperative verb phrases (e.g., "Add X", "Fix Y").',
      'De-duplicate similar commits; collapse tiny refactors unless user-facing.',
      'Do NOT include commit hashes, authors, or PR numbers.',
      'Do NOT add any text outside the section.',
    ].join('\n');

    const requestInput = JSON.stringify(input);

    try {
      const response = await this.client.responses.create({
        model: 'gpt-4o-mini',
        instructions,
        input: requestInput,
      });

      const generated = response.output_text?.trim();

      if (!generated) {
        throw new Error('No changelog content generated');
      }

      return generated;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OpenAI API error: ${message}`);
    }
  }
}
