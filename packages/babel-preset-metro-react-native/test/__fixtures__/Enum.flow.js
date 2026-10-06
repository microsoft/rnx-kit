/**
 * @flow strict
 */

export enum Status {
  Active = 0,
  Inactive = 1,
}

enum Mode {
  Visible = 0,
  Hidden = 1,
}

export function isVisible(mode: number): boolean {
  return Mode.cast(mode) === Mode.Visible;
}
