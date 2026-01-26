'use strict';
const fs = require('fs');
const path = require('path');
const { appendToSheet, appendToDisc } = require('./api/googleApiService');

const MIME_TYPES = {
  default: 'application/octet-stream',
  html: 'text/html; charset=UTF-8',
  js: 'application/javascript; charset=UTF-8',
    jsx: 'text/jsx',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const STATIC_PATH = path.join(process.cwd(), './');
const toBool = [() => true, () => false];
const prepareFile = async (url) => {
    const paths = [STATIC_PATH, url];
    if (url.endsWith('/')) paths.push('index.html');
    const filePath = path.join(...paths);
    const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
    const found = !pathTraversal && exists;
    const streamPath = found ? filePath : STATIC_PATH + '/404.html';
    const ext = path.extname(streamPath).substring(1).toLowerCase();
    const stream = fs.createReadStream(streamPath);
    return { found, ext, stream };
};

async function home (req, res) {
  const file = await prepareFile(req.url);
  const statusCode = file.found ? 200 : 404;
  const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
  res.writeHead(statusCode, {'Content-Type': mimeType});
  file.stream.pipe(res);
  req.toString();
  console.log(`GET /${req.url}`);
}

async function form (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
  res.writeHead(204);
  res.end();
  return;
}
  if (req.url === '/api/form' && req.method === 'POST') {

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
}

    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('boundary=')) {
      throw new Error('Not a multipart request');
}
    const boundary = contentType.split('boundary=')[1];
    const data = parseMultipart(buffer, boundary);

    appendToSheet(data.fields);

// eslint-disable-next-line max-len
    console.log('Form Data:', data.fields); // { username: '...', userphone: '...' }
    console.log('Files:', data.files.map((f) => f.filename));

data.files.forEach((file) => {
      if (file.filename) {
        fs.writeFileSync(path.join(UPLOAD_DIR, file.filename), file.data);
        appendToDisc(file);
        console.log(`Saved: ${file.filename}`);
    }
});
// Promise.allSettled([])
//   .then((values) => { console.log(values); })
//   .catch((err) => console.log(err));
res.end();
try {
    console.log('Create Data');
    // eslint-disable-next-line no-unused-vars
} catch (err) {
    res.writeHead(500);
    res.end('Error loading userdata');
}
console.log('Success');

  }
};

function parseMultipart(buffer, boundary) {
  const fields = {};
  const files = [];
  const delimiter = Buffer.from('--' + boundary);

  const parts = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);

  while (index !== -1) {
    if (index > start) parts.push(buffer.slice(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headerRaw = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4, part.length - 2);

    const nameMatch = headerRaw.match(/name="([^"]+)"/);
    const filenameMatch = headerRaw.match(/filename="([^"]+)"/);

    if (filenameMatch) {

      files.push({ filename, data: body });
            }
        } else if (nameMatch) {

            fields[nameMatch[1]] = body.toString();
        }
    }

    return { fields, files };
}

module.exports = {
  home, form
};