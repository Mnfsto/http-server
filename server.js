'use strict';
const http = require('http');;
const PORT = process.env.PORT || 8000;
require('dotenv').config();
const { home, form } = require('./routes');


const routes = {
  '/': home,
  '/api/form': form,
};

const server = http.createServer(async (req, res) => {
  const handler = routes[req.url];
  if (!handler) {
    res.writeHead(404);
    res.end();
    return;
  }
  handler(req, res);

});


server.listen(PORT, () => {
  console.log(`Server started on ${PORT}!`);
});

// Close Server
process.on('SIGINT', async () => {
  //await client.close();
  console.log('Server ShutDown');
  process.exit();
});

// eslint-disable-next-line no-undef
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION! Reason:', reason);
});
