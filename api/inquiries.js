const { handleInquiry, MAX_BYTES } = require('../server/inquiries.cjs');
module.exports = async function handler(req, res) {
  let body = '';
  if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  else for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BYTES) break;
  }
  const result = await handleInquiry({ method: req.method, headers: req.headers, body });
  for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
  res.statusCode = result.status;
  res.end(JSON.stringify(result.body));
};
