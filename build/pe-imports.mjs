/*---------------------------------------------------------------------------------------------
 *  A real PE import-table reader.
 *
 *  Why this exists: the toolchain's own health check used to grep the raw bytes of a binary for
 *  `*.dll`. That finds strings that are not imports and, more importantly, cannot tell *which*
 *  binary needs a DLL that is absent — so a toolchain missing cc1plus's four math libraries passed
 *  every check until a student's compile failed with no diagnostics at all. The loader resolves
 *  imports per executable: a DLL is found in the importing file's own directory or on PATH, never
 *  in a sibling directory. Anything that wants to know whether a tree is loadable has to walk the
 *  same table the loader walks.
 *--------------------------------------------------------------------------------------------*/

import fs from 'node:fs';
import path from 'node:path';

const IMAGE_FILE_DLL = 0x2000;
const IMPORT_DIRECTORY_INDEX = 1;
const DATA_DIRECTORY_ENTRY_SIZE = 8;

/**
 * Names of the DLLs a PE image imports, lower-cased.
 *
 * Only the import directory is read; delay-load and bound-import tables are not used by MinGW
 * binaries. Throws on a file that is not a PE so a caller does not silently treat a parse failure
 * as "no dependencies".
 */
export function importedDlls(file) {
	const buf = fs.readFileSync(file);
	const e_lfanew = buf.readUInt32LE(0x3C);
	if (buf.readUInt32LE(e_lfanew) !== 0x00004550) {			// "PE\0\0"
		throw new Error(`${path.basename(file)} 不是 PE 映像（找不到 PE 头）`);
	}
	const coff = e_lfanew + 4;
	const sizeOfOptional = buf.readUInt16LE(coff + 16);
	const optional = coff + 20;
	const magic = buf.readUInt16LE(optional);
	const pe32plus = magic === 0x20b;
	if (!pe32plus && magic !== 0x10b) {
		throw new Error(`${path.basename(file)}: 未知的可选头标志 0x${magic.toString(16)}`);
	}
	const characteristics = buf.readUInt16LE(coff + 18);
	const dataDirs = optional + (pe32plus ? 112 : 96);
	const importRva = buf.readUInt32LE(dataDirs + DATA_DIRECTORY_ENTRY_SIZE * IMPORT_DIRECTORY_INDEX);
	const importSize = buf.readUInt32LE(dataDirs + DATA_DIRECTORY_ENTRY_SIZE * IMPORT_DIRECTORY_INDEX + 4);

	const sections = [];
	const sectionStart = optional + sizeOfOptional;
	for (let i = 0; i < buf.readUInt16LE(coff + 2); i++) {
		const s = sectionStart + i * 40;
		sections.push({
			virtualAddress: buf.readUInt32LE(s + 12),
			virtualSize: buf.readUInt32LE(s + 8),
			rawSize: buf.readUInt32LE(s + 16),
			rawPointer: buf.readUInt32LE(s + 20),
		});
	}
	const off = rva => {
		for (const s of sections) {
			const span = Math.max(s.virtualSize, s.rawSize);
			if (rva >= s.virtualAddress && rva < s.virtualAddress + span) {
				return s.rawPointer + (rva - s.virtualAddress);
			}
		}
		return -1;
	};

	const names = new Set();
	if (!importRva || !importSize) { return { isDll: (characteristics & IMAGE_FILE_DLL) !== 0, names }; }

	// Each descriptor is 20 bytes: OriginalFirstThunk, TimeDateStamp, ForwarderChain, Name, FirstThunk.
	// The DLL to load is the Name field; the thunks only say which symbols, and a symbol is not a file.
	for (let entry = off(importRva); entry >= 0; entry += 20) {
		const originalFirstThunk = buf.readUInt32LE(entry);
		const nameRva = buf.readUInt32LE(entry + 12);
		const firstThunk = buf.readUInt32LE(entry + 16);
		if (!originalFirstThunk && !nameRva && !firstThunk) { break; }
		if (nameRva) { names.add(readCString(buf, off(nameRva)).toLowerCase()); }
	}
	return { isDll: (characteristics & IMAGE_FILE_DLL) !== 0, names };
}

function readCString(buf, start) {
	if (start < 0) { return ''; }
	let end = start;
	while (end < buf.length && buf[end] !== 0) { end++; }
	return buf.toString('latin1', start, end);
}

/** Windows' own libraries are next to the loader, not next to us; API sets are virtual. */
const SYSTEM_PREFIXES = ['api-ms-', 'ext-ms-', 'ntdll', 'winsxs'];

function isSystemDll(name, systemDir) {
	if (SYSTEM_PREFIXES.some(p => name.startsWith(p))) { return true; }
	return fs.existsSync(path.join(systemDir, name));
}

/** Every PE under `root`, as `{ file, dir, isDll, needs }`. */
export function scanPES(root, { systemDir = path.join(process.env.SystemRoot || 'C:/Windows', 'System32') } = {}) {
	const images = [];
	const walk = dir => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, entry.name);
			if (entry.isDirectory()) { walk(p); continue; }
			if (!/\.(exe|dll)$/i.test(entry.name)) { continue; }
			try {
				const { isDll, names } = importedDlls(p);
				images.push({ file: p, dir: path.dirname(p), isDll, needs: [...names] });
			} catch (err) {
				// An unreadable PE is a packaging bug, not a reason to report a clean tree.
				throw new Error(`${p}: ${err.message}`);
			}
		}
	};
	walk(root);
	return images.map(image => ({
		...image,
		missing: image.needs.filter(n => !isSystemDll(n, systemDir)
			&& !fs.existsSync(path.join(image.dir, n))),
	}));
}

/**
 * Which directory inside the tree can provide each DLL name.
 *
 * Lower-cased so a package that spells `LibGMP-10.DLL` still matches the import table's spelling.
 */
export function buildProviderIndex(root) {
	const index = new Map();
	const walk = dir => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, entry.name);
			if (entry.isDirectory()) { walk(p); continue; }
			if (/\.dll$/i.test(entry.name)) { index.set(entry.name.toLowerCase(), p); }
		}
	};
	walk(root);
	return index;
}
