import { config } from './config';
import { Ollama } from 'ollama';
import * as vscode from 'vscode';

export async function getSummary(diff: string): Promise<string> {
  const { summaryPrompt, endpoint, summaryTemperature, modelName } =
    config.inference;
  const ollama = new Ollama({ host: endpoint });

  const defaultSummaryPrompt =
    `You are an expert developer specialist in creating commits.
Provide a super concise one sentence overall changes summary of the user \`git diff\` output following strictly the next rules:
- Do not use any code snippets, imports, file routes or bullets points.
- Do not mention the route of file that has been change.
- Simply describe the MAIN GOAL of the changes.
- Output directly the summary in plain text.`;

  const prompt = summaryPrompt || defaultSummaryPrompt;

  try {
    const res = await ollama.chat({
      model: modelName,
      options: {
        temperature: summaryTemperature,
      },
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Here is the \`git diff\` output: ${diff}`,
        },
      ],
    });

    return res.message.content
      .trimStart()
      .split('\n')
      .map((v) => v.trim())
      .join('\n');
  } catch (error) {
    throw Error(
      'Unable to connect to ollama. Please, check that ollama is running.',
    );
  }
}

export async function getCommitMessage(summaries: string[]) {
  const {
    commitPrompt,
    endpoint,
    commitTemperature,
    useUppercase,
    useEmojis,
    commitEmojis,
    modelName,
  } = config.inference;
  const ollama = new Ollama({ host: endpoint });

  const defaultCommitPrompt =
    `Write a Git commit message for the provided diff following these requirements:

- Use present tense and omit any preface
- Keep lines under 74 characters
- Diff format: removed lines start with "-", added lines start with "+"
- Ensure the first line enables semantic-release automation
- Use format: {type}(scope?): {message}
  - type: init, feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
  - scope: optional, e.g. (server), (blog)
- Combine all changes into a single, concise message
- Limit to 100 characters
- Omit issue numbers and explanations
- Message can span multiple lines with emojis and formatting

Examples of good single-line commit messages:
feat(blog): add comment section
chore: run tests on CI
fix(server): send CORS headers

Realworld example of a good multi-line commit message (for reference only - do not use this text literally):
\"\"\"feat(semantic-release): automate versioning and release

✨ Configure semantic-release to streamline releases:

- Determine next version from commit messages
- Generate changelog and release notes
- Publish new versions to NPM
- Commit types: init, feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Use releaseRules to analyze conventional commits
- Integrate with CI pipeline\"\"\"`;
  const prompt = commitPrompt || defaultCommitPrompt;

  try {
    const response = await ollama.chat({
      model: modelName,
      options: {
        temperature: commitTemperature,
        num_predict: 45,
      },
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Here are the summaries changes: ${summaries.join(', ')}`,
        },
      ],
    });

    let commit = response.message.content.replace(/["`]/g, '');

    // Add the emoji to the commit if activated
    if (useEmojis) {
      const emojisMap = JSON.parse(JSON.stringify(commitEmojis));
      for (const [type, emoji] of Object.entries(emojisMap)) {
        const regex = new RegExp(`\\b${type}\\b`, 'g');
        commit = commit.replace(regex, `${emoji} ${type}`);
      }
    }

    // Transform the commit to uppercase if activated
    if (useUppercase) {
      const commitTypeRegex = /^(\w+):/;
      commit = commit.replace(commitTypeRegex, (match, commitType) => {
        const commitMessage = commit.substring(match.length).trim();
        return `${commitType.toUpperCase()}: ${commitMessage}`;
      });
    }

    return commit.trim();
  } catch (error) {
    throw Error('Unable to generate commit.');
  }
}
