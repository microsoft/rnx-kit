export declare type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export declare function goInstallTask(logger?: Logger): () => Promise<void>;
export declare function goBuildTask(logger?: Logger): () => Promise<void>;
export declare function goTask(
  logger: Logger | undefined,
  name: string,
  ...args: string[]
): () => Promise<void>;
