import { Text as RNText } from 'react-native';

import { filterTextProps } from '@fluentui-react-native/adapters';
import { foregroundColorTokens, textTokens } from '@fluentui-react-native/tokens';
import { compose } from '@uifabricshared/foundation-compose';

import { settings } from './Text.settings';
import { textName } from './Text.types';
import type { ITextType } from './Text.types';

export const Text = compose<ITextType>({
  displayName: textName,
  settings,
  slots: {
    root: { slotType: RNText, filter: filterTextProps },
  },
  styles: {
    root: [textTokens, foregroundColorTokens],
  },
});

export default Text;
