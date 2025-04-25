/**
 * 再帰的な部分型
 * オブジェクトのすべてのプロパティを再帰的にオプショナルにする型
 *
 * @template T - 元となるオブジェクト型
 */
export type RecursivePartial<T> = {
  [K in keyof T]?: T[K] extends object ? RecursivePartial<T[K]> : T[K];
};
