
import https from 'https';

console.log("Current System Date: " + new Date().toString());

https.get('https://www.google.com', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Successfully connected to Google HTTPS!');
}).on('error', (e) => {
  console.error('Failed to connect to Google HTTPS:');
  console.error(e);
});
