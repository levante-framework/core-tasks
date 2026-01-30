import { taskStore } from "../../../taskStore";

export function recordCompletion(config: Record<string, any>) {
  if (!config?.firekit?.run?.completed && !taskStore().demoMode) {
    config.firekit.finishRun();
  }
}
