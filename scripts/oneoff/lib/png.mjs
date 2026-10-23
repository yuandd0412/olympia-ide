/**
 * PNG 编解码 + 缩放 + 3x5 点阵文字 + 拼版。
 *
 * 为什么要有这个库：
 *
 * 真机验证要回答的是**像素级**问题（有没有黑帧、有没有硬切），所以必须能解码 PNG。
 * 而「进入动画好不好看」是**目视**问题 —— 要把 30 多帧摆成一张图一次性看，
 * 光会解码不够，还得能编码。
 *
 * 依赖为零：只用 node:zlib 自己写 PNG 容器，不引第三方库。
 *
 * 三个坑：
 *   1. PNG 的 IHDR 里 **colorType** 决定通道数（2=RGB，6=RGBA），解码时别写死。
 *   2. 编码时每行的 filter 字节不能省 —— 少了整张图会花掉。
 *   3. CRC32 是**反射**多项式（0xEDB88320），初值 0xFFFFFFFF、末值取反，
 *      写成正向多项式会得到「看起来很像但就是不对」的校验值。
 */

import zlib from 'node:zlib';

// ---------------------------------------------------------------- CRC32

const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
		}
		table[n] = c;
	}
	return table;
})();

export function crc32(buf) {
	let c = 0xFFFFFFFF;
	for (let i = 0; i < buf.length; i++) {
		c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
	}
	return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---------------------------------------------------------------- 解码

/**
 * 解 8 位 PNG（colorType 2 = RGB，6 = RGBA）。
 * 返回 { w, h, pixels }，pixels 是 RGBA（每像素 4 字节）。
 */
export function decodePng(buf) {
	if (buf.readUInt32BE(0) !== 0x89504e47) {
		throw new Error('不是 PNG');
	}
	let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
	const idat = [];
	while (off < buf.length) {
		const len = buf.readUInt32BE(off);
		const type = buf.toString('ascii', off + 4, off + 8);
		const data = buf.subarray(off + 8, off + 8 + len);
		if (type === 'IHDR') {
			w = data.readUInt32BE(0);
			h = data.readUInt32BE(4);
			bitDepth = data[8];
			colorType = data[9];
			if (bitDepth !== 8) {
				throw new Error('只支持 8 位色深，实际 ' + bitDepth);
			}
			if (colorType !== 2 && colorType !== 6) {
				throw new Error('只支持 RGB/RGBA，实际 colorType=' + colorType);
			}
		} else if (type === 'IDAT') {
			idat.push(data);
		} else if (type === 'IEND') {
			break;
		}
		off += 12 + len;
	}
	const raw = zlib.inflateSync(Buffer.concat(idat));
	const channels = colorType === 6 ? 4 : 3;
	const stride = w * channels;
	const out = Buffer.alloc(w * h * 4);
	let prev = Buffer.alloc(stride);
	let p = 0;
	for (let y = 0; y < h; y++) {
		const filter = raw[p++];
		const line = Buffer.from(raw.subarray(p, p + stride));
		p += stride;
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? line[x - channels] : 0;
			const b = prev[x];
			const c = x >= channels ? prev[x - channels] : 0;
			let v = line[x];
			if (filter === 1) {
				v += a;
			} else if (filter === 2) {
				v += b;
			} else if (filter === 3) {
				v += (a + b) >> 1;
			} else if (filter === 4) {
				const pp = a + b - c;
				const pa = Math.abs(pp - a);
				const pb = Math.abs(pp - b);
				const pc = Math.abs(pp - c);
				v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
			}
			line[x] = v & 0xff;
		}
		for (let x = 0; x < w; x++) {
			const s = x * channels;
			const d = (y * w + x) * 4;
			out[d] = line[s];
			out[d + 1] = line[s + 1];
			out[d + 2] = line[s + 2];
			out[d + 3] = channels === 4 ? line[s + 3] : 255;
		}
		prev = line;
	}
	return { w, h, pixels: out };
}

// ---------------------------------------------------------------- 编码

/**
 * 编码成 8 位真彩 PNG（colorType 2）。rgb 长度必须是 w*h*3。
 */
export function encodePng(w, h, rgb) {
	const stride = w * 3;
	const raw = Buffer.alloc(h * (1 + stride));
	for (let y = 0; y < h; y++) {
		raw[y * (1 + stride)] = 0;               // filter = 0 (None)
		rgb.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
	}
	const idat = zlib.deflateSync(raw, { level: 9 });
	const chunk = (type, data) => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length, 0);
		const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body), 0);
		return Buffer.concat([len, body, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8;   // bit depth
	ihdr[9] = 2;   // color type = truecolor
	ihdr[10] = 0;  // compression
	ihdr[11] = 0;  // filter
	ihdr[12] = 0;  // interlace
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', idat),
		chunk('IEND', Buffer.alloc(0))
	]);
}

// ---------------------------------------------------------------- 缩放

/**
 * 盒式平均缩放。输入 { w, h, pixels }，输出 { w, h, rgb }。
 * 用平均而不是最近邻：极光是渐变，最近邻会在缩图上打出锯齿和色带。
 */
export function downscale(img, tw, th) {
	const { w, h, pixels } = img;
	const out = Buffer.alloc(tw * th * 3);
	for (let y = 0; y < th; y++) {
		const y0 = Math.floor(y * h / th);
		const y1 = Math.max(y0 + 1, Math.floor((y + 1) * h / th));
		for (let x = 0; x < tw; x++) {
			const x0 = Math.floor(x * w / tw);
			const x1 = Math.max(x0 + 1, Math.floor((x + 1) * w / tw));
			let r = 0, g = 0, b = 0, n = 0;
			for (let yy = y0; yy < y1; yy++) {
				for (let xx = x0; xx < x1; xx++) {
					const d = (yy * w + xx) * 4;
					r += pixels[d];
					g += pixels[d + 1];
					b += pixels[d + 2];
					n++;
				}
			}
			const o = (y * tw + x) * 3;
			out[o] = Math.round(r / n);
			out[o + 1] = Math.round(g / n);
			out[o + 2] = Math.round(b / n);
		}
	}
	return { w: tw, h: th, rgb: out };
}

// ---------------------------------------------------------------- 3x5 点阵文字

const FONT = {
	'0': ['111', '101', '101', '101', '111'],
	'1': ['010', '110', '010', '010', '111'],
	'2': ['111', '001', '111', '100', '111'],
	'3': ['111', '001', '111', '001', '111'],
	'4': ['101', '101', '111', '001', '001'],
	'5': ['111', '100', '111', '001', '111'],
	'6': ['111', '100', '111', '101', '111'],
	'7': ['111', '001', '010', '010', '010'],
	'8': ['111', '101', '111', '101', '111'],
	'9': ['111', '101', '111', '001', '111'],
	'.': ['000', '000', '000', '000', '010'],
	':': ['000', '010', '000', '010', '000'],
	'-': ['000', '000', '111', '000', '000'],
	's': ['000', '000', '111', '001', '111']
};

/**
 * 在 RGB 缓冲上画一行点阵文字。
 * 不支持的字符画成空 —— 宁可少画，也不要画成乱码。
 */
export function drawText(rgb, bufW, bufH, text, px, py, scale, color) {
	let cursor = px;
	for (const ch of text) {
		const glyph = FONT[ch];
		if (glyph) {
			for (let gy = 0; gy < 5; gy++) {
				for (let gx = 0; gx < 3; gx++) {
					if (glyph[gy][gx] !== '1') {
						continue;
					}
					for (let sy = 0; sy < scale; sy++) {
						for (let sx = 0; sx < scale; sx++) {
							const x = cursor + gx * scale + sx;
							const y = py + gy * scale + sy;
							if (x < 0 || y < 0 || x >= bufW || y >= bufH) {
								continue;
							}
							const o = (y * bufW + x) * 3;
							rgb[o] = color[0];
							rgb[o + 1] = color[1];
							rgb[o + 2] = color[2];
						}
					}
				}
			}
		}
		cursor += 4 * scale;
	}
	return cursor - px;
}

export function textWidth(text, scale) {
	return text.length * 4 * scale;
}

// ---------------------------------------------------------------- 拼版

/**
 * 把若干张已缩放的图拼成一张联系表（contact sheet）。
 *
 * tiles: [{ rgb, w, h, label }]
 * 每格底部压一条黑边写标签，方便一眼看清「第几帧 / 动画第几秒」。
 */
export function contactSheet(tiles, cols, gap = 6, labelHeight = 18, bg = [16, 16, 20]) {
	if (!tiles.length) {
		throw new Error('没有可拼的图');
	}
	const tileW = tiles[0].w;
	const tileH = tiles[0].h;
	const rows = Math.ceil(tiles.length / cols);
	const sheetW = cols * tileW + (cols + 1) * gap;
	const sheetH = rows * (tileH + labelHeight) + (rows + 1) * gap;
	const rgb = Buffer.alloc(sheetW * sheetH * 3);
	for (let i = 0; i < rgb.length; i += 3) {
		rgb[i] = bg[0];
		rgb[i + 1] = bg[1];
		rgb[i + 2] = bg[2];
	}
	tiles.forEach((tile, i) => {
		const r = Math.floor(i / cols);
		const c = i % cols;
		const x0 = gap + c * (tileW + gap);
		const y0 = gap + r * (tileH + labelHeight + gap);
		for (let y = 0; y < tileH; y++) {
			const src = y * tile.w * 3;
			const dst = ((y0 + y) * sheetW + x0) * 3;
			tile.rgb.copy(rgb, dst, src, src + tile.w * 3);
		}
		if (tile.label) {
			const scale = 2;
			const tw = textWidth(tile.label, scale);
			drawText(rgb, sheetW, sheetH, tile.label, x0 + Math.max(0, Math.floor((tileW - tw) / 2)), y0 + tileH + 4, scale, [235, 235, 240]);
		}
	});
	return { w: sheetW, h: sheetH, rgb };
}
