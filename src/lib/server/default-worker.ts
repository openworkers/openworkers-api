import type { IWorkerLanguage } from '#lib/types/index.ts';
import defaultWorkerJs from '../../../examples/default-worker-js.txt?raw';
import defaultWorkerTs from '../../../examples/default-worker-ts.txt?raw';

export function defaultWorkerScript(language: IWorkerLanguage): string {
  return language === 'typescript' ? defaultWorkerTs : defaultWorkerJs;
}
