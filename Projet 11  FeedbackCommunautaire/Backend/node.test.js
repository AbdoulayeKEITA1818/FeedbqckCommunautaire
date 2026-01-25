// server.mjs
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

export const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World!\n');
});
// starts a simple http server locally on port 3000
// Only listen if the file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(3000, '127.0.0.1', () => {
    console.log('Listening on 127.0.0.1:3000');
  });
}
// run with `node server.mjs`
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { server } from './node.js';

describe('HTTP Server', () => {
  // Close the server after tests finish to prevent hanging processes
  after(() => {
    server.close();
  });

  test('GET / should return 200 and "Hello World!"', async () => {
    // Start server on a random available port for testing
    if (!server.listening) {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    }

    const { port } = server.address();
    const url = `http://127.0.0.1:${port}`;

    const response = await fetch(url);
    const text = await response.text();

    assert.strictEqual(response.status, 200, 'Status code should be 200');
    assert.strictEqual(response.headers.get('content-type'), 'text/plain', 'Content-Type should be text/plain');
    assert.strictEqual(text, 'Hello World!\n', 'Response body should match');
  });
});
