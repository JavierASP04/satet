import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viteCandidates = [
	join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
	join(root, '..', '..', 'node_modules', 'vite', 'bin', 'vite.js')
];
const viteBin = viteCandidates.find((candidate) => existsSync(candidate));
if (!viteBin) throw new Error('No se encontró Vite.');

const children = [
	spawn(process.execPath, [viteBin, 'dev'], { cwd: root, stdio: 'inherit' }),
	spawn(process.execPath, [join(root, 'scripts', 'https-proxy.mjs')], { cwd: root, stdio: 'inherit' })
];

function stop() {
	for (const child of children) child.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

for (const child of children) {
	child.on('exit', (code) => {
		stop();
		process.exit(code ?? 0);
	});
}
