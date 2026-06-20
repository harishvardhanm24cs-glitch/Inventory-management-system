import http from 'http';

http.get('http://localhost:5000/api/ai/recommendations', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response body:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching API:', err.message);
});
