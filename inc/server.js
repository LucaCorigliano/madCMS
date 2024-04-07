const fs = require('fs');
const path = require('path');
const marked = require('marked');
const mime =  require('mime-types');
const http = require('http');
module.exports = {
    /**
     * Checks if the path is a child of the specified folder
     * @param {string} filePath Path to check
     * @param {string} parent Parent folder to check against
     * @returns {boolean}
     */
    checkSafePath : function(filePath, parent) {
        const requestedFilePath = path.resolve(filePath);
        return requestedFilePath.startsWith(parent);
    },
    /**
     * Serves a static file. 
     * @param {string} filePath 
     * @param {http.ServerResponse} res 
     */
    serveStatic: function(filePath, res) {
    
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                return;
            }
            const mimeType = mime.lookup(filePath);
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Cache-Control': 'max-age=3600',
            });
            res.end(data);
        });
    },
    /**
     * Looks up a file and serves it, processing markdown if needed
     * @param {http.IncomingMessage} req 
     * @param {http.ServerResponse} res 
     * @param {boolean} main Used for checking if this is a retry on a failed error message display
    */
    serve: function(req, res, main) {
        // Parse the requested URL
        const url = req.url.trim().replace(/\/$/, '');
        const extension = url.split('.').pop();
        const fileName = url.split('/').pop();
        const publicPath = path.join(__dirname, '../public');
        const filePath = path.join(publicPath, url);
        console.log(url, extension, fileName, publicPath, filePath);
        // Verify director trasversal
        if (!this.checkSafePath(filePath, publicPath)) {
            res.writeHead(403);
            res.write("Unauthorized.");
            res.end();
            return;
        }

        
    
        // Check if the file exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // File not found
                if (!main) {
                    res.end("This file was not found. Also I couldn't find the correct error page. What a mess.");
                    return;
                } else {
                    req.url = "errors/404.md"
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    this.serve(req, res, false);
                    return 
                }
    
            } else {
                // Verify empty filename
                if (fs.lstatSync(filePath).isDirectory() ) {
                    req.url = url + "/index.md";
                    this.serve(req, res, false);
                    return 
                }
                // This is only for local developement
                if (extension.toLowerCase() !== "md") {
                    return this.serveStatic(filePath, res);
                }
                
                // Read the file content
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        if (!main) {
                            res.end("I couldn't read this file. Also I couldn't find the correct error page. What a mess.");
                            return;
                        } else {
                            req.url = "errors/500.md"
                            res.writeHead(500, { 'Content-Type': 'text/html' });
                            this.serve(req, res, false);
                            return
                        }
                    } else {
                        if(data.startsWith("REDIR:")) {
                            res.writeHead(302, {'Location' : data.replace('REDIR:', '')});
                            return;
                        }
                        // Process the markdown content
                        const htmlContent = marked.marked(data);
    
                        // Set the response header
                        if(main)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                        const splitUrl = url.split('/');
                        splitUrl.pop();
                        let breadcrumbs = [];
                        let last = "/";
                        let first = true;
                        let modifyDate = fs.statSync(filePath).mtime.toISOString().split('T')[0];
                        for(var breadcrumb of splitUrl) {
                            let entry = {
                                url : `${last}${breadcrumb}`,
                                text : first ? process.env.title : breadcrumb,
                            };
                            last = entry.url;
                            first = false;
                            breadcrumbs.push(entry); 
                        }
                        // Write the HTML content to the client
                        res.end(process.template({
                            pageTitle : url,
                            breadcrumbs : breadcrumbs,
                            fileName : fileName,
                            content : htmlContent,
                            modifyDate : modifyDate,
                            env : process.env
                            
                        })); // End the response
                    }
                });
            }
        });
    }
}
