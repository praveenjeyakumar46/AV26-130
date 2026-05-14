/**
 * Simple script to test backend connection
 * Run: node backend/test-connection.js
 */

const http = require('http');

const testEndpoint = (path, callback) => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`✅ ${path}:`, JSON.stringify(json, null, 2));
        callback(true);
      } catch (e) {
        console.log(`⚠️ ${path}: Non-JSON response:`, data);
        callback(false);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`❌ ${path}:`, error.message);
    callback(false);
  });

  req.setTimeout(3000, () => {
    console.error(`⏱️ ${path}: Timeout`);
    req.destroy();
    callback(false);
  });

  req.end();
};

console.log('🔍 Testing backend connection...\n');

testEndpoint('/api/health', (success) => {
  if (success) {
    console.log('\n✅ Backend is running and accessible!');
    process.exit(0);
  } else {
    console.log('\n❌ Backend is not accessible. Make sure:');
    console.log('   1. Backend server is running (npm run dev in backend folder)');
    console.log('   2. Backend is listening on port 3000');
    console.log('   3. No firewall is blocking the connection');
    process.exit(1);
  }
});
