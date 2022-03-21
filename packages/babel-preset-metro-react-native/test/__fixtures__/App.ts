// @ts-ignore
require("typescript/lib/remap-test/lib/lib");

const enum Direction {
  Up,
  Down,
  Left,
  Right,
}

function takeDirection(direction: Direction): string {
  switch (direction) {
    case Direction.Up:
      return "up";
    case Direction.Down:
      return "down";
    case Direction.Left:
      return "left";
    case Direction.Right:
      return "right";
  }
}

console.log(takeDirection(Direction.Up));

export { takeDirection };
