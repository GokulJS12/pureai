// API-only service. Reverse-proxy /api/inquiries to this loopback port with HTTPS.
const http = require('node:http');
const handler = require('../api/inquiries.js');
http.createServer((req, res) => {
  if (req.url.split('?')[0] !== '/api/inquiries') { res.writeHead(404); return res.end(); }
  handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end('{"error":"Inquiry service unavailable."}'); });
}).listen(Number(process.env.PORT || 3001), '127.0.0.1');
