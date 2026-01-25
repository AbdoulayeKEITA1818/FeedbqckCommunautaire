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