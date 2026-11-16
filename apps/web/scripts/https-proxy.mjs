import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import { generate } from 'selfsigned';

const targetPort = 5390;
const listenPort = 5443;

function lanAddresses() {
	const addresses = [];
	for (const entries of Object.values(os.networkInterfaces())) {
		for (const entry of entries ?? []) {
			if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address);
		}
	}
	return addresses;
}

const addresses = lanAddresses();
const pems = await generate([{ name: 'commonName', value: 'SATET' }], {
	algorithm: 'sha256',
	days: 30,
	keySize: 2048,
	extensions: [
		{
			name: 'subjectAltName',
			altNames: [
				{ type: 2, value: 'localhost' },
				{ type: 7, ip: '127.0.0.1' },
				...addresses.map((ip) => ({ type: 7, ip }))
			]
		}
	]
});

const server = https.createServer({ key: pems.private, cert: pems.cert }, (req, res) => {
	const proxy = http.request(
		{
			host: '127.0.0.1',
			port: targetPort,
			method: req.method,
			path: req.url,
			headers: req.headers
		},
		(upstream) => {
			res.writeHead(upstream.statusCode ?? 502, upstream.headers);
			upstream.pipe(res);
		}
	);
	proxy.on('error', () => {
		if (!res.headersSent) res.statusCode = 502;
		res.end('El servidor web no está disponible.');
	});
	req.pipe(proxy);
});

server.on('upgrade', (req, socket, head) => {
	const upstream = net.connect(targetPort, '127.0.0.1', () => {
		const lines = [`${req.method} ${req.url} HTTP/1.1`];
		for (const [key, value] of Object.entries(req.headers)) {
			if (Array.isArray(value)) {
				for (const item of value) lines.push(`${key}: ${item}`);
			} else if (value != null) {
				lines.push(`${key}: ${value}`);
			}
		}
		upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
		if (head.length) upstream.write(head);
		upstream.pipe(socket);
		socket.pipe(upstream);
	});
	upstream.on('error', () => socket.destroy());
	socket.on('error', () => upstream.destroy());
});

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') {
		console.log(`[web] El acceso seguro ya está en el puerto ${listenPort}.`);
		return;
	}
	console.error(error);
	process.exit(1);
});

server.listen(listenPort, '0.0.0.0', () => {
	console.log(`[web] Computadora: http://localhost:${targetPort}/`);
	for (const address of addresses) {
		console.log(`[web] Teléfono:    https://${address}:${listenPort}/`);
	}
});
