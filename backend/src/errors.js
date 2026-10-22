export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === "ZodError") {
    return res.status(400).json({ error: "Validation failed", details: error.flatten() });
  }
  if (error.code === "23505" || error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "A record with those unique values already exists" });
  }
  if (error.code === "23503" || error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(409).json({ error: "This record is referenced by another record" });
  }
  const status = error.status ?? 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: status >= 500 ? "Internal server error" : error.message,
    ...(error.details ? { details: error.details } : {}),
  });
}
