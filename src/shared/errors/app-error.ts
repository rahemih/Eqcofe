export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly details: Record<string, unknown> = {},
    public readonly fieldErrors: readonly FieldError[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(code, message, 409, details);
  }
}
