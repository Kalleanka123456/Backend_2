export default function errorMiddleware(error, _req, res, _next) {
  const isMalformedJson =
    error instanceof SyntaxError &&
    (error.status === 400 || error.statusCode === 400) &&
    "body" in error;

  const statusCode = isMalformedJson
    ? 400
    : Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

  res.status(statusCode).json({
    error: isMalformedJson
      ? "JSON-begäran är felaktigt formaterad."
      : statusCode === 500
        ? "Ett internt serverfel uppstod."
        : error.message,
  });
}
