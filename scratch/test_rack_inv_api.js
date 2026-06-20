import http from 'http';

http.get('http://localhost:5000/api/rack-inventory', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('DATA:', data);
  });
}).on('error', (err) => {
  console.log('ERROR:', err.message);
});
