export interface GenerateArgs {
  base: string;
  compare: string;
  repo: string;
  changelog: string;
  token: string | null;
  maxWorkers: number;
  verbose: boolean;
}
