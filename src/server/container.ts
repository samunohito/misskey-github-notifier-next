export type ContainerKey = string | symbol | number;

export type IContainerDisposable = {
  dispose(): void | Promise<void>;
};

export interface IContainer {
  has(key: string): boolean;

  set<T>(key: ContainerKey, value: T): void;

  get<T>(key: ContainerKey): T | undefined;

  require<T>(key: ContainerKey): T;

  delete(key: ContainerKey): void;

  dispose(): Promise<void>;
}

export class Container implements IContainer {
  private readonly services: Map<ContainerKey, unknown> = new Map();

  public has(key: string): boolean {
    return this.services.has(key);
  }

  public set<T>(key: ContainerKey, value: T): void {
    this.services.set(key, value);
  }

  public get<T>(key: ContainerKey): T | undefined {
    return this.services.get(key) as T;
  }

  public require<T>(key: ContainerKey): T {
    const service = this.get<T>(key);
    if (!service) {
      throw new Error(`Service ${String(key)} not found`);
    }
    return service;
  }

  public delete(key: ContainerKey): void {
    this.services.delete(key);
  }

  public async dispose(): Promise<void> {
    for (const [key, service] of this.services.entries()) {
      if (service != null && typeof service === "object" && "dispose" in service) {
        await (service as IContainerDisposable).dispose();
      }
      this.delete(key);
    }
  }
}

export const DI = {
  notifier: Symbol("notifier"),
} as const;
