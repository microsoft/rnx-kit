// Simple TypeScript with type annotations and interfaces
interface User {
  name: string;
  age: number;
  email?: string;
}

type Status = "active" | "inactive";

function greetUser(user: User, status: Status): string {
  const greeting: string = `Hello, ${user.name}!`;
  if (status === "active") {
    return greeting;
  }
  return `${greeting} (inactive)`;
}

const defaultUser: User = {
  name: "World",
  age: 0,
};

export { greetUser, defaultUser };
export type { User, Status };
