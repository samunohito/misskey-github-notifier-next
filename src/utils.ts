// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Constructor<T> = new (...args: any[]) => T;
