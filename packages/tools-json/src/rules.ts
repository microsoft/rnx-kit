import type { LintContext } from "./context.ts";

export type RuleSetting = "error" | "warn" | "off";

export type RuleTupleConfig<TOptions> = [RuleSetting, TOptions?];

export type RuleConfig<TOptions> = RuleSetting | RuleTupleConfig<TOptions>;

export type ResolvedConfig<TOptions> = {
  enable: RuleSetting;
  options?: TOptions;
};

export type Rule<TOptions, TContext extends LintContext, TTarget> = {
  config: () => RuleConfig<TOptions>;
  update: (config: RuleConfig<TOptions>) => void;
  shouldRun: () => boolean;
  run: (target: TTarget, context: TContext) => TTarget;
};

export type RuleFactory<TOptions, TContext extends LintContext, TTarget> = (
  config?: ResolvedConfig<TOptions>
) => Rule<TOptions, TContext, TTarget>;
