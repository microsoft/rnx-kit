import { buildUseTokens } from '@fluentui-react-native/framework';

import type { TextTokens } from './Text.types';
import { textName } from './Text.types';

export const useTextTokens = buildUseTokens<TextTokens>(
  (t) => ({
    variant: 'secondaryStandard',
    color: t.colors.bodyText,
  }),
  textName,
);
