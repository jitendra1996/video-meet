const BASE =
  process.env.NEXT_PUBLIC_CLASSROOM_API_URL ?? "http://localhost:4000";

export type ApiResult<T> = { success: boolean; data: T };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function classroomFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: T;
    error?: string;
    code?: string;
    details?: unknown;
  };
  if (!res.ok || json.success === false) {
    throw new ApiError(
      json.error ?? res.statusText,
      res.status,
      json.code,
      json.details
    );
  }
  return json.data as T;
}
