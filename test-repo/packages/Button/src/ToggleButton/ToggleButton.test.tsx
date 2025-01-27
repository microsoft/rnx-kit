import * as React from 'react';

import { checkRenderConsistency, checkReRender } from '@fluentui-react-native/test-tools';
import * as renderer from 'react-test-renderer';

import { ToggleButton } from './ToggleButton';

it('ToggleButton default', () => {
  const tree = renderer.create(<ToggleButton>Default Button</ToggleButton>).toJSON();
  expect(tree).toMatchSnapshot();
});

it('Button simple rendering does not invalidate styling', () => {
  checkRenderConsistency(() => <ToggleButton>Default button</ToggleButton>, 2);
});

it('Button re-renders correctly', () => {
  checkReRender(() => <ToggleButton>Render twice</ToggleButton>, 2);
});

it('Button shares produced styles across multiple renders', () => {
  const style = { backgroundColor: 'black' };
  checkRenderConsistency(() => <ToggleButton style={style}>Shared styles</ToggleButton>, 2);
});

it('Button re-renders correctly with style', () => {
  const style = { borderColor: 'blue' };
  checkReRender(() => <ToggleButton style={style}>Shared Style Render</ToggleButton>, 2);
});
