# Toggle Button

## Background

The `ToggleButton` is a `Button` that is designed show a selected state when toggled.
Does not render on Android use `Switch` instead.

## Requirements

If using FURN's theming, the `ToggleButton` requires use of the `ThemeProvider` from `@fluentui-react-native/theme` to work properly with themes. Please see [this page](../../../../../docs/pages/Guides/UpdateThemeProvider.md) for information on updating your `ThemeProvider` if using the version from `@uifabricshared/theming-react-native`.

## Sample Code

Basic examples:

```jsx
<ToggleButton>Text</ToggleButton>
<ToggleButton checked={true}>Text</ToggleButton>
<ToggleButton defaultChecked={true}>Text</ToggleButton>
<ToggleButton icon={{ svgSource: { uri: 'https://www.example.com/test.svg', viewBox: '0 0 100 100' } }} />
<ToggleButton icon={{ svgSource: { uri: 'https://www.example.com/test.svg', viewBox: '0 0 100 100' } }}>Text</ToggleButton>
<ToggleButton appearance="primary">Text</ToggleButton>
<ToggleButton disabled>Text</ToggleButton>
<ToggleButton size="small">Text</ToggleButton>
```

More examples on the [Test pages for the Button](../../../../../apps/fluent-tester/src/TestComponents/Button). Instructions on running the tester app can be found [here](../../../../../apps/fluent-tester/README.md).

## Visual Examples

Win32:

![ToggleButton with text on win32 example](../../assets/togglebutton_example_win32.png)

```tsx
<ToggleButton>Text</ToggleButton>
```

![ToggleButton with text and checked state on win32 example](../../assets/togglebutton_checked_example_win32.png)

```tsx
<ToggleButton checked={true}>Text</ToggleButton>
```

## Variants

Variant options are the same as the base `Button` component.

## API

### Slots

The `ToggleButton` component has three slots, or parts. The slots behave as follows:

- `root` - The outer container representing the `ToggleButton` itself that wraps everything passed via the `children` prop.
- `icon` - If specified, renders an `icon` either before or after the `children` as specified by the `iconPosition` prop.
- `content` - If specified, renders the first entry of `children` as text.

The slots can be modified using the `compose` function on the `ToggleButton`. For more information on using the `compose` API, please see [this page](../../../../framework/composition/README.md).

### Props

```ts
export interface ToggleButtonProps extends ButtonProps {
  /**
   * Defines the controlled checked state of the `ToggleButton`.
   * Mutually exclusive to `defaultChecked`.
   * This should only be used if the checked state is to be controlled at a higher level and there is a plan to pass the correct value based on handling `onClick` events and re-rendering.
   */
  checked?: boolean;

  /**
   * Defines whether the `ToggleButton` is inititally in a checked state or not when rendered.
   * Mutually exclusive to `checked`.
   */
  defaultChecked?: boolean;
}
```

### Styling Tokens

Tokens can be used to customize the styling of the control by using the `customize` function on the `ToggleButton`. For more information on using the `customize` API, please see [this page](../../../../framework/composition/README.md). The `ToggleButton` has the following tokens:

```ts
export interface CompoundButtonTokens extends ButtonTokens {
  /**
   * States that can be applied to a button.
   * These can be used to modify styles of the button when under the specified state.
   */
  checked?: ToggleButtonTokens;
}
```

## Behaviors

This button includes the same behaviors as base `Button`. It has some additional states.

### States

The following section describes the additional states a `ToggleButton` can have.

#### Checked state

A checked `ToggleButton` changes styling to communicate that the button is currently selected or toggled.
