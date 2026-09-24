import http from 'http';

const data = JSON.stringify({ regNo: '6176AC22UCS130', amount: 16000 });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/student/create-payment-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log('HEADERS:', JSON.stringify(res.headers));
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('BODY:', body);
    try { console.log('PARSED:', JSON.parse(body)); } catch (e) {}
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
