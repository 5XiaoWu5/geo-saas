export type CrawlQueueStatus = "queued" | "processing" | "completed" | "failed";

export type CrawlQueueTask = {
  id: string;
  scanId: string;
  url: string;
  status: CrawlQueueStatus;
  createdAt: string;
  updatedAt: string;
};

const queueByScan = new Map<string, CrawlQueueTask[]>();

export async function addUrlTasks(scanId: string, urls: string[]) {
  const existing = queueByScan.get(scanId) ?? [];
  const knownUrls = new Set(existing.map((task) => task.url));
  const now = new Date().toISOString();
  const nextTasks = urls
    .filter((url) => !knownUrls.has(url))
    .map((url) => ({ id: `task_${scanId}_${Math.random().toString(36).slice(2)}`, scanId, url, status: "queued" as const, createdAt: now, updatedAt: now }));

  queueByScan.set(scanId, [...existing, ...nextTasks]);
  return nextTasks;
}

export async function getNextTask(scanId: string) {
  return (queueByScan.get(scanId) ?? []).find((task) => task.status === "queued") ?? null;
}

export async function updateTaskStatus(scanId: string, taskId: string, status: CrawlQueueStatus) {
  const tasks = queueByScan.get(scanId) ?? [];
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task));
  queueByScan.set(scanId, updatedTasks);
  return updatedTasks.find((task) => task.id === taskId) ?? null;
}

export async function getQueueTasks(scanId: string) {
  return queueByScan.get(scanId) ?? [];
}

export async function clearQueue(scanId: string) {
  queueByScan.delete(scanId);
}
