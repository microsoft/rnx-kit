import * as React from "react";
import TestRenderer from "react-test-renderer";
import App from "../src/App";

it("renders correctly", () => {
  TestRenderer.create(<App />);
});
