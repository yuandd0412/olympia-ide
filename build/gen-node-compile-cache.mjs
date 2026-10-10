/*---------------------------------------------------------------------------------------------
 *  Generates the packaged Node.js compile cache for the unpacked Windows product tree.
 *
 *  Upstream runs this inside `gulp vscode-win32-x64-ci` (see oss/build/gulpfile.vscode.ts), but the
 *  task is gated on `product.quality`, which this fork leaves unset. Setting quality would also pull
 *  in the appx manifest branch that needs `win32ContextMenu`, so the generation step is run here
 *  instead, reusing upstream's own generator, spawn protocol and validation.
 *
 *  Usage: node build/gen-node-compile-cache.mjs [productDirectory]
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import path from 'path';
import { generateNodeCompileCache } from '../oss/build/lib/nodeCompileCache.ts';

const productDirectory = path.resolve(process.argv[2] ?? 'D:\\oler-ide-v2\\VSCode-win32-x64');
const packagedProduct = JSON.parse(fs.readFileSync(path.join(productDirectory, 'resources', 'app', 'product.json'), 'utf8'));

// Checked here rather than through upstream's shouldGenerateNodeCompileCache, because that predicate
// also requires product.quality and this fork has none.
if (process.platform !== 'win32' || process.arch !== 'x64') {
	console.error(`Refusing to generate: the runtime only supports a portable compile cache on ` +
		`win32/x64 (this is ${process.platform}/${process.arch}).`);
	process.exit(1);
}

const applicationPath = path.join(productDirectory, `${packagedProduct.nameShort}.exe`);
if (!fs.existsSync(applicationPath)) {
	console.error(`Refusing to generate: ${applicationPath} does not exist. Package the product tree first.`);
	process.exit(1);
}

// Upstream derives this from the commit; without win32VersionedUpdate the resources folder is flat.
const versionedResourcesFolder = packagedProduct.win32VersionedUpdate ? packagedProduct.commit.substring(0, 10) : '';

await generateNodeCompileCache(process.platform, productDirectory, versionedResourcesFolder, packagedProduct);
