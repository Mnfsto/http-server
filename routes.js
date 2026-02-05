'use strict';
const fs = require('fs');
const path = require('path');
const { appendToSheet, appendToDisc } = require('./api/googleApiService');
const sendMail = require('./mailer/nodemailer');
const smtp = require('./mailer/config');
const { bot } = require('./bot');
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

async function home(req, res) {
  const file = await prepareFile(req.url);
  const statusCode = file.found ? 200 : 404;
  const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
  res.writeHead(statusCode, { 'Content-Type': mimeType });
  file.stream.pipe(res);
  req.toString();
  console.log(`GET /${req.url}`);
}

async function form(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  };
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

    await appendToSheet(data.fields);
    const message = {
      to: smtp.to,
      subject: 'Inquiry',
      text: '',
      html: `
<div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px;
 margin: 0 auto; line-height: 1.6; color: #333;">
    <!-- Header -->
    <div style="border-bottom: 2px solid #333;
     padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #333;">New Website Inquiry</h2>
        <span style="font-size: 14px; color: #777;">
        ${new Date().toLocaleString('en-US')}</span>
    </div>

    <!-- Details Box -->
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        <p style="margin: 0 0 15px 0;">
            <strong>👤 Client Name:</strong> <br> 
            ${data.fields.name}
        </p>
        <p style="margin: 0 0 15px 0;">
            <strong>✉️ Email:</strong> <br> 
            <a href="mailto:${data.fields.email}"
             style="color: #0070f3; text-decoration: none;">
            ${data.fields.email}</a>
        </p>
        <p style="margin: 0;">
            <strong>📞 Phone Number:</strong> <br> 
            <a href="tel:${data.fields.telephone}"
             style="color: #333; text-decoration: none;">
            ${data.fields.telephone}</a>
        </p>
    </div>

    <!-- Footer / Action -->
    <div style="margin-top: 30px; font-size: 14px; color: #888;">
        <p>Please contact the client as soon as possible.</p>
        <a href="mailto:${data.fields.email}"
         style="background-color: #333; color: #fff; padding: 10px 20px;
          text-decoration: none; border-radius: 4px; display: inline-block;">
          Reply to Client</a>
    </div>
</div>
`,
    };
    await sendMail(message);
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

    if (process.env.BOT_CHAT) {
      await bot.sendMessage(process.env.BOT_CHAT, `
      New Website Inquiry:
      ${data.fields.name}
      tel: ${data.fields.telephone}
      email: ${data.fields.email}
       `);
    };
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
      const filename = filenameMatch[1]; // <--- Было пропущено объявление
      if (filename.trim() !== '') {
        files.push({ filename, data: body });
      }
    } else if (nameMatch) {
      fields[nameMatch[1]] = body.toString();
    }
  }

  return { fields, files };
};

module.exports = {
  home, form
};
