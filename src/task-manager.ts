export type TaskStatus = 'active' | 'cancelled' | 'completed';

export interface VoiceTask {
  id: number;
  request: string;
  status: TaskStatus;
  createdAt: number;
  abortController: AbortController;
}

export class TaskManager {
  private currentTaskId = 0;
  private tasks = new Map<number, VoiceTask>();

  startTask(request: string): VoiceTask {
    if (this.currentTaskId !== 0) {
      this.cancelCurrentTask();
    }

    const task: VoiceTask = {
      id: ++this.currentTaskId,
      request,
      status: 'active',
      createdAt: Date.now(),
      abortController: new AbortController(),
    };

    this.tasks.set(task.id, task);

    console.log(`[TASK] Started task ${task.id}: ${request}`);

    return task;
  }

  cancelCurrentTask(): void {
    const current = this.tasks.get(this.currentTaskId);

    if (!current || current.status !== 'active') {
      return;
    }

    current.status = 'cancelled';

    current.abortController.abort();

    console.log(`[TASK] Cancelled task ${current.id}`);
    console.log(`[TASK] Abort signal sent to task ${current.id}`);
  }

  completeTask(taskId: number): void {
    const task = this.tasks.get(taskId);

    if (!task || task.status !== 'active') {
      return;
    }

    task.status = 'completed';

    console.log(`[TASK] Completed task ${task.id}`);
  }

  isCurrentTask(taskId: number): boolean {
    return taskId === this.currentTaskId;
  }

  isTaskActive(taskId: number): boolean {
    const task = this.tasks.get(taskId);

    return task?.status === 'active';
  }

  getCurrentTask(): VoiceTask | undefined {
    return this.tasks.get(this.currentTaskId);
  }

  getTaskAbortSignal(taskId: number): AbortSignal | undefined {
    const task = this.tasks.get(taskId);

    return task?.abortController.signal;
  }
}