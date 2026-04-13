// Generic patterns and utility types
type Nullable<T> = T | null | undefined;

interface Repository<T extends { id: string }> {
  getById(id: string): Promise<Nullable<T>>;
  getAll(): Promise<T[]>;
  save(item: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}

class InMemoryRepository<T extends { id: string }>
  implements Repository<T>
{
  private items: Map<string, T> = new Map();

  async getById(id: string): Promise<Nullable<T>> {
    return this.items.get(id) ?? null;
  }

  async getAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async save(item: T): Promise<T> {
    this.items.set(item.id, item);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

function createRepository<T extends { id: string }>(): Repository<T> {
  return new InMemoryRepository<T>();
}

export { InMemoryRepository, createRepository };
export type { Repository, Nullable };
