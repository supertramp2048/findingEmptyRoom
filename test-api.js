const http = require('http');

let completed = 0;

// Test Stats Endpoint
console.log('=== Testing GET /api/schedule/stats ===\n');

const options1 = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/schedule/stats',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req1 = http.request(options1, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response (raw):', data);
    }
    completed++;
    if (completed === 2) process.exit(0);
  });
});

req1.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
  process.exit(1);
});

req1.setTimeout(5000);
req1.end();

// Test Available Rooms Endpoint - after a small delay
setTimeout(() => {
  console.log('\n\n=== Testing GET /api/rooms/available ===');
  console.log('Query: thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2\n');
  
  const options2 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const req2 = http.request(options2, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Status Code:', res.statusCode);
      try {
        const parsed = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response (raw):', data);
      }
      completed++;
      if (completed === 2) process.exit(0);
    });
  });
  
  req2.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
    process.exit(1);
  });
  
  req2.setTimeout(5000);
  req2.end();
}, 100);
