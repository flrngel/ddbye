export class WorkerConfigError extends Error {
  override readonly name = "WorkerConfigError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class UnresolvableTargetError extends Error {
  override readonly name = "UnresolvableTargetError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class AgentQueryError extends Error {
  override readonly name = "AgentQueryError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}
