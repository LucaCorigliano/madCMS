// Includes
const http = require('http');
const server = require('./inc/server');
const handlebars = require('handlebars');
const fs = require('fs');

require('dotenv').config()
process.template = handlebars.compile(fs.readFileSync(process.env.template, 'utf8'));




// Create an HTTP server
const app = http.createServer((req, res) => {
    req.url = req.url.split("?")[0];
    server.serve(req, res, true);
});

// Listen on port 3000
app.listen({port: process.env.port, host: process.env.host}, () => {
    console.log(`Server running at http://${process.env.host}:${process.env.port}`);
});
