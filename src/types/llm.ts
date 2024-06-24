export enum Model {
  Llama3 = 'llama3:latest',
  Codegemma = 'codegemma:latest',
  Codellama = 'codellama',
  Mistral = 'mistral:latest',
}

export type EmojisMap = {
  init: string;
  feat: string;
  fix: string;
  docs: string;
  style: string;
  refactor: string;
  perf: string;
  test: string;
  build: string;
  ci: string;
  chore: string;
  revert: string;
};
