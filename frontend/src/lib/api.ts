export async function startRun(body: { url: string; maxPages?: number; maxDepth?: number; concurrency?: number; renderBudget?: number; botAvoidanceEnabled?: boolean; }) {
  const r = await fetch("/api/runs/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

export async function getProgress(runId: string) {
  const r = await fetch(`/api/runs/${runId}/progress`);
  return r.json();
}

export async function getExtractionStatus(runId: string) {
  const r = await fetch(`/api/confirm/${runId}/status`);
  return r.json();
}

export async function listPages(runId: string, p = 1, size = 100) {
  const r = await fetch(`/api/pages/${runId}?page=${p}&size=${size}`);
  return r.json();
}

export async function getPage(runId: string, pageId: string) {
  const r = await fetch(`/api/pages/${runId}/${pageId}`);
  return r.json();
}

// Review API functions
export async function getDraft(runId: string) {
  const r = await fetch(`/api/review/${runId}/draft`);
  return r.json();
}

export async function confirmDraft(runId: string, draft: any) {
  const r = await fetch(`/api/review/${runId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft })
  });
  return r.json();
}

export async function getConfirmed(runId: string) {
  const r = await fetch(`/api/review/${runId}/confirmed`);
  return r.json();
}

export async function getRunSummary(runId: string) {
  const r = await fetch(`/api/review/${runId}/summary`);
  return r.json();
}

// Utility functions
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'stopped':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Mock React Query hooks (these would normally be real hooks)
export function useRuns() {
  return {
    data: { 
      runs: [
        {
          run_id: "run_123",
          status: "completed",
          config: {
            url: "https://example.com",
            max_pages: 20,
            max_depth: 3,
            concurrency: 5
          },
          created_at: new Date().toISOString(),
          progress: {
            queued: 15,
            visited: 15,
            errors: 0,
            skipped: 0,
            eta_seconds: 0
          }
        },
        {
          run_id: "run_124",
          status: "running",
          config: {
            url: "https://test.com",
            max_pages: 10,
            max_depth: 2,
            concurrency: 3
          },
          created_at: new Date(Date.now() - 3600000).toISOString(),
          progress: {
            queued: 8,
            visited: 5,
            errors: 1,
            skipped: 0,
            eta_seconds: 120
          }
        }
      ]
    },
    isLoading: false,
    error: null
  };
}

export function useDeleteRun() {
  return {
    mutate: (runId: string) => {
      console.log('Delete run:', runId);
    },
    isPending: false
  };
}

export function useRunProgress(runId: string) {
  return {
    data: {
      runId,
      queued: 10,
      visited: 8,
      errors: 1,
      skipped: 1,
      etaSeconds: 120
    },
    isLoading: false,
    error: null
  };
}

export function useRunPages(runId: string, page: number = 1, size: number = 100) {
  return {
    data: [],
    isLoading: false,
    error: null
  };
}

export function usePageDetail(runId: string, pageId: string) {
  return {
    data: null,
    isLoading: false,
    error: null
  };
}