import { settings } from './PrimaryButton.settings';
import { Button } from '../Button';

/**
 * @deprecated This component is deprecated in favor of ButtonV1. The PrimaryButton will be removed when the package moves to 1.0.0.
 * At that point, ButtonV1 will be renamed to Button. Please see MIGRATION.md for details on how to move to the new Button.
 */
export const PrimaryButton = Button.compose({ displayName: 'PrimaryButton', settings });
