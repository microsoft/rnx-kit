import React, { useState, Fragment } from "react";

function List({ items, renderItem, emptyMessage = "No items" }) {
  const [selected, setSelected] = useState(null);

  if (!items || items.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <Fragment>
      <ul className="list">
        {items.map((item, index) => (
          <li
            key={item.id || index}
            className={selected === index ? "selected" : ""}
            onClick={() => setSelected(index)}
          >
            {renderItem ? renderItem(item) : <span>{item.label}</span>}
          </li>
        ))}
      </ul>
      {selected !== null && (
        <div className="detail">
          <p>Selected: {items[selected]?.label ?? "unknown"}</p>
          <button onClick={() => setSelected(null)}>Clear</button>
        </div>
      )}
    </Fragment>
  );
}

export default List;
