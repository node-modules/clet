export type MountPlugin<T, Core> = {
  [key in keyof T]: T[key] extends (core: Core, ...args: infer I) => any ? (...args: I) => MountPlugin<T, Core> : T[key];
} & Core;

export type BuiltinPlugin<T extends PluginLike, Core> = {
  [key in keyof T]: (...args: RestParam<T[key]>) => Core;
};

export type AsyncFunction = (...args: any[]) => Promise<any>;

export type RestParam<T> = T extends (first: any, ...args: infer R) => any ? R : any;

export interface PluginLike {
  [key: string]: (core: any, ...args: any[]) => any;
}
