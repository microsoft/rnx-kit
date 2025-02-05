import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { App } from "../src/App";

it("renders correctly", () => {
  render(<App />);
  expect(screen.toJSON()).toMatchSnapshot();
});
