// React component in plain JSX
import React, { useState, useCallback } from "react";

function Counter({ initialCount = 0, step = 1, label = "Count" }) {
  const [count, setCount] = useState(initialCount);

  const increment = useCallback(() => {
    setCount((prev) => prev + step);
  }, [step]);

  const decrement = useCallback(() => {
    setCount((prev) => prev - step);
  }, [step]);

  const reset = useCallback(() => {
    setCount(initialCount);
  }, [initialCount]);

  return (
    <div className="counter">
      <span className="label">{label}</span>
      <div className="controls">
        <button onClick={decrement}>-</button>
        <span className="value">{count}</span>
        <button onClick={increment}>+</button>
      </div>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

export default Counter;
