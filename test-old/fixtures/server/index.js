import http from 'http';
import { URL } from 'url';

export default function startServer() {
  const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    console.log(`recieve request: ${urlObj.href}`);
    res.end(`hi, ${urlObj.searchParams.get('name') || 'anonymous'}`);
  });
  server.listen(3000, () => {
    console.log('[%s] server started at localhost:3000', process.pid);
  });

  // setTimeout(() => {
  //   console.log('auto exit');
  //   process.exit(0);
  // }, 5000);

  // process.on('SIGTERM', () => {
  //   console.log('recieve SIGTERM, gracefull exit');
  //   server.close();
  //   process.exit();
  // });
}
