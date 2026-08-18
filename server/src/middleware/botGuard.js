/** Lightweight bot honeypot — real users leave these fields empty. */
export function rejectBotPayload(req, res, next) {
  const traps = [
    req.body?.website,
    req.body?.company_url,
    req.body?.fax,
    req.body?.hp_field,
  ];
  if (traps.some(value => value != null && String(value).trim() !== '')) {
    return res.status(400).json({ error: 'Request rejected' });
  }
  next();
}
