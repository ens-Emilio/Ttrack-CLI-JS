export class AppError extends Error {
  constructor(code, message, details = null, cause = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    if (cause) this.cause = cause;
  }
}

