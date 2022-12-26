import http from 'node:http';

const port = process.env.PORT || 3000;

const app = http.createServer((req, res) => {
  console.log(`Receive: ${req.url}`);

  if (req.url === '/exit') {
    res.end('byebye');
    process.exit(0);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  if (process.send) {
    process.send('ready');
  }

  setTimeout(() => {
    console.log('timeout');
    process.exit(0);
  }, 5000);
});
