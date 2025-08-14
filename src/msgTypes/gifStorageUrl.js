import * as Utils from '../utils.js';

const FIELDS = [
	{ name: 'storageUrl', variants: [{ prefix: 'URL: ' }] },
	{ name: 'dumpMsgUrl', variants: [{ prefix: 'Original message: ' }] },
	{ name: 'dumpUrl', variants: [{ prefix: 'Original URL: ' }] },
	{ name: 'authorMention', variants: [{ prefix: 'Uploader: ' }] },
];
const allowedMentions = { parse: [] };

export function getDataFromMsg(msg) {
	if (msg.attachments.size > 1) throw Error(`Storage msg with more than one GIF: ${msg.url}`);
	const data = Utils.fieldsFromContent(msg.content, FIELDS);

	if (msg.attachments.size) data.storageUrl = msg.attachments.first().url;
	else if (!data.storageUrl) throw Error(`Storage msg without storageUrl: ${msg.url}`);

	if (data.authorMention) data.authorId = Utils.getUserIdFromMention(data.authorMention);
	if (data.dumpMsgUrl) data.dumpMsgId = Utils.getMsgIdFromUrl(data.dumpMsgUrl);

	data.storageMsgId = msg.id;
	data.storageMsgUrl = msg.url;

	return data;
}

export function getMessageOptions(gif) {
	const content = Utils.contentFromFields(FIELDS, gif);
	return { content, allowedMentions };
}

// TODO: improve fieldsFromContent function to say whether all content was "consumed".
export function isMsgGeneratedByThisView(msg) {
	const data = Utils.fieldsFromContent(msg.content, FIELDS);
	return data.storageUrl && data.dumpUrl; //  && data.dumpMsgUrl && data.authorMention; (?)
}
