export interface Commit {
  hash: string;
  date: string;
  subject: string;
  body: string;
}

export interface ChangelogInput {
  version: string;
  date: string;
  commits: Pick<Commit, 'subject' | 'body'>[];
}

export abstract class BaseProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract generateChangelog(input: ChangelogInput): Promise<string>;
}
