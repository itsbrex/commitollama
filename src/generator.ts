import { config } from './config';
import { Ollama } from 'ollama';
import * as vscode from 'vscode';

export async function getSummary(diff: string): Promise<string> {
  const { summaryPrompt, endpoint, summaryTemperature, modelName } =
    config.inference;
  const ollama = new Ollama({ host: endpoint });

  const defaultSummaryPrompt =
    `Write a Git commit message in Bill Gates style in present tense for the provided diff without prefacing it with anything, the response must be in the language English.
  Lines must not be longer than 74 characters.
  The sent text will be the differences between files, where deleted lines are prefixed with a single minus sign and added lines are prefixed with a single plus sign.
  Make absolutely sure, that the first line of the message always follows the requirements of semantic-release, so that automated processes can easily generate a new version from the commit message. Your only goal is to retrieve a single commit message.
  Based on the provided user changes, combine them in ONE SINGLE commit message retrieving the global idea, following strictly the next rules:
  Always use the next format: \'{type}(scope?): {commit_message}\` where \`{type}\` is one of \`init\`, \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`perf\`, \`test\`, \`build\`, \`ci\`, \`chore\`, \`revert\` and where \`scope\` is optional'
  -  Output directly a single commit message in plain text.
  - Be as concise as possible. 50 characters max.
  - Do not add any issues numeration nor explain your output.
  - In general the pattern mostly looks like this: {type}(scope?): {commit_message}
  Real world examples can look like this:
  - chore: run tests on travis ci
  - fix(server): send cors headers
  - feat(blog): add comment section
  Example:
  feat(wasm-plugin): Add WasmPlugin resource for Istio Ingress
  ✨ Add WasmPlugin resource for Istio Ingress
  ℹ️ This commit adds a WasmPlugin resource to the ingress.tf file. The WasmPlugin resource is used to configure Wasm plugins for Istio Ingress.
  The changes include:
  - Adding a new resource kubectl_manifest for the WasmPlugin
  - Configuring the WasmPlugin with the necessary metadata, spec, and annotations
  - Defining the pluginConfig for the WasmPlugin`;

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

  //   const defaultCommitPrompt = `You are an expert developer specialist in creating commits messages.
  // Your only goal is to retrieve a single commit message.
  // Based on the provided user changes, combine them in ONE SINGLE commit message retrieving the global idea, following strictly the next rules:
  // Always use the next format: \'{type}[scope?]: {commit_message}\` where \`{type}\` is one of \`init\`, \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`perf\`, \`test\`, \`build\`, \`ci\`, \`chore\`, \`revert\` and where scope is optional.'
  // - Output directly a single commit message in plain text.
  // - Be as concise as possible. 74 characters max.
  // - Do not add any issues numeration nor explain your output.
  // - In general the pattern mostly looks like this: {type}(scope?): {commit_message}
  // Real world examples can look like this:
  // - feat(wasm-plugin): add WasmPlugin resource for Istio Ingress
  // - chore: run tests on travis ci
  // - fix(server): send CORS headers

  const defaultCommitPrompt =
    `Write a Git commit message in Bill Gates style in present tense for the provided diff without prefacing it with anything, the response must be in the language English.
Lines must not be longer than 74 characters.
The sent text will be the differences between files, where deleted lines are prefixed with a single minus sign and added lines are prefixed with a single plus sign.
Make absolutely sure, that the first line of the message always follows the requirements of semantic-release, so that automated processes can easily generate a new version from the commit message. Your only goal is to retrieve a single commit message.
Based on the provided user changes, combine them in ONE SINGLE commit message retrieving the global idea, following strictly the next rules:
Always use the next format: \'{type}(scope?): {commit_message}\` where \`{type}\` is one of \`init\`, \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`perf\`, \`test\`, \`build\`, \`ci\`, \`chore\`, \`revert\` and where \`scope\` is optional'
-  Output directly a single commit message in plain text.
- Be as concise as possible. 50 characters max.
- Do not add any issues numeration nor explain your output.
- In general the pattern mostly looks like this: {type}(scope?): {commit_message}
Real world examples can look like this:
- chore: run tests on travis ci
- fix(server): send cors headers
- feat(blog): add comment section
Example:
feat(wasm-plugin): Add WasmPlugin resource for Istio Ingress

✨ Add WasmPlugin resource for Istio Ingress

ℹ️ This commit adds a WasmPlugin resource to the ingress.tf file. The WasmPlugin resource is used to configure Wasm plugins for Istio Ingress.
The changes include:
- Adding a new resource kubectl_manifest for the WasmPlugin
- Configuring the WasmPlugin with the necessary metadata, spec, and annotations
- Defining the pluginConfig for the WasmPlugin
  `;
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
