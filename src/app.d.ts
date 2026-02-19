// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  type hex = string;
  type uuid = string;
  type timestamp = number;
  type Dictionary<T> = Record<string, T>;

  namespace App {
    interface Locals {
      userId: string;
      authMethod: 'jwt' | 'api_key';
    }
  }
}

export {};
