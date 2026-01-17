'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path')
const PORT = process.env.PORT || 8000;


const MIME_TYPES = {
    default: 'application/octet-stream',
    html: 'text/html; charset=UTF-8',
    js: 'application/javascript; charset=UTF-8',
    jsx: "text/jsx",
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
};

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

const server = http.createServer(async (req, res) =>{
    const file = await prepareFile(req.url);
    const statusCode = file.found ? 200 : 404;
    const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
    res.writeHead(statusCode, { 'Content-Type': mimeType });
    file.stream.pipe(res);
    console.log(`${req.method} ${req.url} ${statusCode}`);

    if(req.url === '/userdata.html' && req.method === 'POST'){
        let body = '';
        for await (const chunk of req){
            body += chunk;
        };
        const formData = new URLSearchParams(body);
        const userName = formData.get('username');
        const userPhone = formData.get('userphone');
        console.log("Form Data:", { userName, userPhone });
        try {
            console.log("Create Data")
        }catch (err){
            res.writeHead(500);
            res.end('Error loading userdata');
        }
        console.log("Success");
        return
    }
})

server.listen(PORT, ()=>{
    console.log(`Server started on ${PORT}!`)
});

// Close Server
process.on("SIGINT", async () => {
    //await client.close();
    console.log("Server ShutDown");
    process.exit();
})

process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION! Reason:', reason);
});
