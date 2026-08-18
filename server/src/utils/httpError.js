export function publicError(err, fallback = 'Request failed') {
  if (err?.status && err?.message) return err.message;
  if (process.env.NODE_ENV === 'production') return fallback;
  return err?.message || fallback;
}

export function sendError(res, err, fallback = 'Request failed') {
  const status = err?.status || 500;
  return res.status(status).json({ error: publicError(err, fallback) });
}
