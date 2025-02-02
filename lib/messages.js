const { deserialize, serialize } = require("./serialization.js");

const MessageType = Object.freeze({
	INIT: 0,
	USER: 1,
	DISCONNECT: 2,
	CURSOR: 3,
	TILE: 4,
	CHORD: 5,
	HOLE: 6,
	BOARD: 7,
	FLAG: 8,
	WIN: 9,
	LOSE: 10,
	RESET: 11
});

const MessageSpecs = Object.freeze({
	[MessageType.INIT]: { id: 8, mineCount: 10, time: 8, flags: [8] },
	[MessageType.USER]: { id: 8, hue: 10, saturation: 7, lightness: 7, username: "" },
	[MessageType.DISCONNECT]: { id: 8 },
	[MessageType.CURSOR]: { id: 8, x: 12, y: 12 },
	[MessageType.TILE]: { x: 8, y: 8, tile: 4 },
	[MessageType.CHORD]: { x: 8, y: 8, tiles: [3] },
	[MessageType.HOLE]: { clickX: 8, clickY: 8, startX: 8, startY: 8, last: 1, directions: [5] },
	[MessageType.BOARD]: { tiles: [4] },
	[MessageType.FLAG]: { x: 8, y: 8, id: 8 },
	[MessageType.WIN]: {},
	[MessageType.LOSE]: { id: 8, mines: [1] },
	[MessageType.RESET]: { mineCount: 10 }
});

let typeBits = Math.ceil(Math.log2(Object.values(MessageType).length));

function serializeMessage(data) {
	const type = data[0];
	const specs = Object.values(MessageSpecs[type]);
	const sizes = [typeBits];
	const specLen = specs.length;
	for (let i = 0; i < specLen; i++) {
		let spec = specs[i];
		const isString = typeof spec === "string";

		if (isString && typeof data[i + 1] === "string")
			data[i + 1] = [...data[i + 1]].map(c => c.charCodeAt(0));

		if (isString || Array.isArray(spec)) {
			const elemLen = isString ? 8 : spec[0];
			const dataLen = data[i + 1] ? data[i + 1].length : 0;
			for (let j = 0; j < dataLen; j++)
				sizes.push(elemLen);
		} else {
			sizes.push(spec);
		}
	}

	return serialize(data.flat(), sizes);
}

function deserializeMessage(data) {
	const offset = 8 - typeBits;
	const type = (data[0] & ((typeBits ** 2 - 1) << offset)) >> offset;
	const specs = MessageSpecs[type];
	const sizes = Object.values(MessageSpecs[type]);
	sizes.unshift(typeBits);

	const dataBits = data.length * 8;
	const fixedBits = sizes.reduce((a, b) => a + (Array.isArray(b) ? 0 : b), 0);
	const hasString = sizes.some((s) => typeof s === "string");
	const arrayElemBits = hasString ? 8 : (sizes.find(Array.isArray) ?? [0])[0];
	if (arrayElemBits > 0) {
		sizes.pop();
		const length = Math.floor((dataBits - fixedBits) / arrayElemBits);
		for (let i = 0; i < length; i++)
			sizes.push(arrayElemBits);
	}

	const arr = deserialize(data, sizes);

	const msgData = [];
	const specEntries = Object.entries(specs);
	specEntries.unshift(["type", typeBits]);
	const len = specEntries.length;
	for (let i = 0; i < len; i++) {
		const spec = specEntries[i][1];
		msgData.push(typeof spec === "string" ? String.fromCharCode(...arr) : Array.isArray(spec) ? arr : arr.shift());
	}
	return msgData;
}

function formatMessageData(messageData) {
	const type = messageData.shift();
	const specs = Object.entries(MessageSpecs[type]);
	const entries = messageData.map((d, i) => [specs[i][0], d]);
	entries.unshift(["type", type]);
	return Object.fromEntries(entries);
}

module.exports = { MessageType, serializeMessage, deserializeMessage, formatMessageData };