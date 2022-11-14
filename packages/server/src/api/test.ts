export const api = {
  f: (a: number, b: number, c: number = 0) => a + b + c,
  fullName: (firstName: string, lastName?: string) => `${firstName} ${lastName}`,
  obj: {
    prod: (a: number, b: number) => a * b,
  },
};

type Func = (...params: any[]) => any;

type FuncSig<FuncType extends Func> = {
  params: Parameters<FuncType>;
  result: ReturnType<FuncType>;
  isFunction: true;
};

type FuncTree = { [name: string]: Func | FuncTree };

type FuncSigTree<T extends FuncTree> = {
  [Property in keyof T]: T[Property] extends FuncTree
    ? FuncSigTree<T[Property]>
    : T[Property] extends Func
    ? FuncSig<T[Property]>
    : number;
};

export type ApiSchema = FuncSigTree<typeof api>;

export type Test = {
  // params: Parameters<typeof f>;
  // ret: ReturnType<typeof f>;
  p: [a: number, b: number];
  name: string;
  // value: number;
  // sum: (a: number, b: number) => number;
};
