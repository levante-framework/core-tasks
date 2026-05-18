import { taskStore } from '../../../taskStore';

export function recordCompletion(config: Record<string, any>) {
  if (!taskStore().demoMode && config.firekit && !config.firekit?.run?.completed) {
    config.firekit.finishRun();
  }
}
