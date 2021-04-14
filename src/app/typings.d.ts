type ObjectKeys<T> = 
  T extends object ? (keyof T)[] :
  T extends number ? [] :
  T extends Array<any> | string ? string[] :
  never;

interface ObjectConstructor {
  keys<T>(o: T): ObjectKeys<T>
}

/**
 * Extract arguments of function
 */
type ArgumentsType<F> = F extends (...args: infer A) => any ? A : never;

/**
 * Provides all object method names as strings
 */
type MethodNames<T> = {
  [P in keyof T]: T[P] extends (...a: any) => infer R ? P : never
}[keyof T];

/**
 * Provides the type of an object method
 */
type TypeOfClassMethod<T, K extends keyof T> = {
  [P in keyof T]: T[P] extends (...a: any) => infer R ? T[K] : never
}[keyof T];
