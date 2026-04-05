// Async/await patterns with TypeScript
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

async function fetchItems<T>(
  endpoint: string,
  transform: (raw: unknown) => T
): Promise<ApiResponse<T>> {
  const response = await fetch(endpoint);
  const json = await response.json();
  return {
    data: transform(json),
    status: response.status,
    message: "ok",
  };
}

class DataService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.json() as Promise<T>;
  }
}

export { fetchItems, DataService };
export type { ApiResponse };
