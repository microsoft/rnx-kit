import * as React from 'react';

import * as renderer from 'react-test-renderer';

import { Button } from './Button';

it('Button default', () => {
  const tree = renderer.create(<Button content="Default Button" />).toJSON();
  expect(tree).toMatchSnapshot();
});
