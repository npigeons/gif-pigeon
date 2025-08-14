import * as Utils from '../utils.js';
import { rejected } from '../globals.js';

const FIELDS = [
	{ name: 'dumpMsgUrl', variants: [{ prefix: 'Original message: ' }] },
	{ name: 'dumpUrl', variants: [{ prefix: 'Original URL: <', suffix: '>' }] },
];

export async function rejectGif(gif) {
	const content = Utils.contentFromFields(FIELDS, gif);
	await rejected.send({ content });
}

export async function rejectDumpMsg(dumpMsgUrl) {
	const content = Utils.contentFromFields(FIELDS, { dumpMsgUrl });
	await rejected.send({ content });
}

export function getDataFromMsg(msg) {
	const data = Utils.fieldsFromContent(msg.content, FIELDS);
	if (data.dumpMsgUrl) data.dumpMsgId = Utils.getMsgIdFromUrl(data.dumpMsgUrl);
	return data;
}
