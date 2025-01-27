import * as React from 'react';

import { checkRenderConsistency, checkReRender } from '@fluentui-react-native/test-tools';
import * as renderer from 'react-test-renderer';

import { FAB } from './FAB';

const fontBuiltInProps = {
  fontFamily: 'Arial',
  codepoint: 0x2663,
  fontSize: 16,
};
const iconProps = { fontSource: { ...fontBuiltInProps }, color: '#fff' };

beforeAll(() => {
  jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    select: () => null,
  }));
});

it('Default FAB (iOS)', () => {
  const tree = renderer.create(<FAB icon={iconProps}>Default FAB (iOS)</FAB>).toJSON();
  expect(tree).toMatchSnapshot();
});

it('Custom FAB with no shadow(iOS)', () => {
  const CustomFABNoShadow = FAB.customize({ shadowToken: undefined });
  const tree = renderer.create(<CustomFABNoShadow icon={iconProps}>Custom FAB with no shadow(iOS)</CustomFABNoShadow>).toJSON();
  expect(tree).toMatchSnapshot();
});

it('Button simple rendering does not invalidate styling', () => {
  checkRenderConsistency(() => <FAB icon={iconProps}>Default FAB</FAB>, 2);
});

it('FAB re-renders correctly', () => {
  checkReRender(() => <FAB icon={iconProps}>Render twice</FAB>, 2);
});

it('FAB shares produced styles across multiple renders', () => {
  const style = { backgroundColor: 'black' };
  checkRenderConsistency(
    () => (
      <FAB icon={iconProps} style={style}>
        Shared styles
      </FAB>
    ),
    2,
  );
});

it('FAB re-renders correctly with style', () => {
  const style = { borderColor: 'blue' };
  checkReRender(
    () => (
      <FAB icon={iconProps} style={style}>
        Shared Style Render
      </FAB>
    ),
    2,
  );
});

afterAll(() => {
  jest.unmock('react-native/Libraries/Utilities/Platform');
});
