// A refused request (invalid value, limit reached, name taken); the message is safe to show to the user.
export class ServiceError extends Error {
  readonly status: 400 | 403 | 409 | 503;

  constructor(message: string, status: 400 | 403 | 409 | 503) {
    super(message);
    this.status = status;
  }
}
