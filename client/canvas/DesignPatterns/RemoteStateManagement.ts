import { NetworkConnection } from "../Network/NetworkConnection";

export type Emitter<InterfaceType> = new (network: NetworkConnection) => InterfaceType;

export function CreateEmitterClass<InterfaceType>(InterfaceClass: new () => InterfaceType): Emitter<InterfaceType> {
  const Emitter: any = function (network: NetworkConnection) {
    this.network = network;
  };

  const prototype = Object.getPrototypeOf(new InterfaceClass());
  const methods = Object.getOwnPropertyNames(prototype).filter(x => x != "constructor");

  for (const method of methods) {
    Emitter.prototype[method] = function (...args: any[]) {
      this.network.updateTool(method, ...args);
    };
  }

  return Emitter;
}

export function ProtectInstance<Type>(instance: Type, InterfaceClass: new () => Type): Type {
  const receiver: any = {};

  const prototype = Object.getPrototypeOf(new InterfaceClass());
  const methods = Object.getOwnPropertyNames(prototype).filter(x => x != "constructor");

  for (const method of methods) {
    receiver[method] = (...args: any[]) => instance[method](...args);
  }

  return receiver;
}
