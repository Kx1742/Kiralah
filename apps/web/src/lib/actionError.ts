export type ActionErrorCode =
  | "invalid"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "taken"
  | "full"
  | "rateLimited"
  | "invalidQr";

const STATUS: Record<ActionErrorCode, number> = {
  invalid: 400,
  invalidQr: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  taken: 409,
  full: 409,
  rateLimited: 429,
};

export class ActionError extends Error {
  readonly status: number;

  constructor(readonly code: ActionErrorCode) {
    super(code);
    this.status = STATUS[code];
  }
}
