// React component with TypeScript and JSX
import React from "react";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = "primary",
}) => {
  const style = variant === "primary" ? styles.primary : styles.secondary;
  return (
    <button style={style} onClick={onPress} disabled={disabled}>
      {title}
    </button>
  );
};

const styles = {
  primary: { backgroundColor: "blue", color: "white" },
  secondary: { backgroundColor: "gray", color: "black" },
};

export default Button;
export type { ButtonProps };
