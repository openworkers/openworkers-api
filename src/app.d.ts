// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  type hex = string;
  type uuid = string;
  type timestamp = number;
  type Dictionary<T> = Record<string, T>;

  // Short hash of the commit the build comes from (vite.config.ts)
  const __GIT_COMMIT__: string;

  namespace App {
    interface Locals {
      userId: string;
      authMethod: 'jwt' | 'api_key';
    }
  }
}

export {};
