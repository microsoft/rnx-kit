/* eslint-disable react/react-in-jsx-scope */
import "react";
import "./App.css";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

import useBatteryStatus from "./useBatteryStatus";

function App() {
  const batteryLevel = useBatteryStatus();

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <h2>Battery status: {batteryLevel.toFixed(2)}</h2>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
