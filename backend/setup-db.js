const { spawn } = require('child_process');

// Try to create the database using psql
const psql = spawn('"C:\\Program Files\\PostgreSQL\\18\\bin\\psql"', [
  '-h', 'localhost',
  '-U', 'postgres',
  '-c', 'CREATE DATABASE auth_api;'
], { 
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

psql.stdout.on('data', (data) => {
  stdout += data.toString();
});

psql.stderr.on('data', (data) => {
  stderr += data.toString();
});

psql.on('close', (code) => {
  if (stderr.includes('already exists')) {
    console.log('✓ Database auth_api already exists');
    process.exit(0);
  } else if (stderr.includes('password authentication failed')) {
    console.error('✗ PostgreSQL authentication failed - password required');
    console.error('Try running: psql -U postgres -c "ALTER USER postgres WITH PASSWORD \'postgres\';"');
    process.exit(1);
  } else if (code === 0) {
    console.log('✓ Database auth_api created successfully');
    process.exit(0);
  } else {
    console.error('Error output:', stderr);
    process.exit(1);
  }
});
