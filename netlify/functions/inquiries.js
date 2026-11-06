const { handleInquiry } = require('../../server/inquiries.cjs');
exports.handler = async event => {
  const result = await handleInquiry({ method: event.httpMethod, headers: Object.fromEntries(Object.entries(event.headers).map(([k,v]) => [k.toLowerCase(), v])), body: event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '' });
  return { statusCode: result.status, headers: result.headers, body: JSON.stringify(result.body) };
};
