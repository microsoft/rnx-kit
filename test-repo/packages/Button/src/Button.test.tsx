import * as React from 'react';
import { Pressable, Text } from 'react-native';

import { Icon } from '@fluentui-react-native/icon';
import { checkRenderConsistency, checkReRender } from '@fluentui-react-native/test-tools';
import * as renderer from 'react-test-renderer';

import { Button } from './Button';

describe('Button component tests', () => {
  it('Button default', () => {
    const tree = renderer.create(<Button>Default Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button disabled', () => {
    const tree = renderer.create(<Button disabled>Disabled Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button primary', () => {
    const tree = renderer.create(<Button appearance="primary">Primary Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button subtle', () => {
    const tree = renderer.create(<Button appearance="subtle">Subtle Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button circular', () => {
    const tree = renderer.create(<Button shape="circular">Circular Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button square', () => {
    const tree = renderer.create(<Button shape="square">Square Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button small', () => {
    const tree = renderer.create(<Button size="small">Small Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button large', () => {
    const tree = renderer.create(<Button size="large">Large Button</Button>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button customized', () => {
    const CustomButton = Button.customize({ backgroundColor: 'pink' });
    const tree = renderer.create(<CustomButton>Custom Button</CustomButton>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button composed', () => {
    const ComposedButton = Button.compose({
      slots: {
        root: Pressable,
        icon: Icon,
        content: Text,
      },
    });
    const tree = renderer.create(<ComposedButton>Composed Button with RNText</ComposedButton>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('Button simple rendering does not invalidate styling', () => {
    checkRenderConsistency(() => <Button>Default button</Button>, 2);
  });

  it('Button re-renders correctly', () => {
    checkReRender(() => <Button>Render twice</Button>, 2);
  });

  it('Button shares produced styles across multiple renders', () => {
    const style = { backgroundColor: 'black' };
    checkRenderConsistency(() => <Button style={style}>Shared styles</Button>, 2);
  });

  it('Button re-renders correctly with style', () => {
    const style = { borderColor: 'blue' };
    checkReRender(() => <Button style={style}>Shared Style Render</Button>, 2);
  });
});
