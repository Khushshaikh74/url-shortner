import path from 'path'
import { createServer } from 'http'
import { writeFile, readFile } from 'fs/promises'
import crypto from "crypto"

const PORT = 3000
const DATA_FILE = path.join("data", "links.json")

const serverFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end("404 page not found");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links))
}


const server = createServer(async (req, res) => {
    if (req.method === "GET") {
        if (req.url === "/") {
            return await serverFile(res, path.join("public", "index.html"), 'text/html');
        } else if (req.url === "/style.css") {
            return await serverFile(res, path.join("public", "style.css"), 'text/css');
        } else if (req.url === "/links") {
            const links = await loadLinks();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(links));
        } else {
            const links = await loadLinks();
            const shortcode = req.url.slice(1); // ✅ fix here

            if (links[shortcode]) {
                res.writeHead(302, { Location: links[shortcode] });
                return res.end();
            }

            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Shortened URL not found");
        }
    }


    if (req.method === "POST" && req.url === "/shorten") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            const { url, shortcode } = JSON.parse(body);

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("URL not found");
            }

            const links = await loadLinks();
            const finalShortcode = shortcode || crypto.randomBytes(4).toString("hex");

            if (links[finalShortcode]) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Shortcode already exists. Please choose another");
            }

            links[finalShortcode] = url;
            await saveLinks(links);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, shortcode: finalShortcode }));
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server listening at port: http://localhost:${PORT}/`)
})