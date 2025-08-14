import * as Utils from '../utils.js';

const FIELDS = [
	{ name: 'dumpMsgUrl', variants: [{ prefix: 'Original message: ' }] },
	{ name: 'dumpUrl', variants: [{ prefix: 'Original URL: <', suffix: '>' }] },
	{ name: 'authorMention', variants: [{ prefix: 'Uploader: ' }] },
];
const allowedMentions = { parse: [] };

export function getDataFromMsg(msg) {
	if (msg.attachments.size !== 1)
		throw Error(`Storage msg should have one attachment: ${msg.url}`);
	const data = Utils.fieldsFromContent(msg.content, FIELDS);

	data.storageUrl = msg.attachments.first().url;
	// GIFs uploaded before The Pigeon was introduced don't have these fields.
	if (data.authorMention) data.authorId = Utils.getUserIdFromMention(data.authorMention);
	if (data.dumpMsgUrl) data.dumpMsgId = Utils.getMsgIdFromUrl(data.dumpMsgUrl);

	data.storageMsgId = msg.id;
	data.storageMsgUrl = msg.url;

	return data;
}

export function getMessageOptions(gif) {
	const content = Utils.contentFromFields(FIELDS, gif);
	const files = [gif.dumpUrl];
	return { content, files, allowedMentions };
}

export function isMsgGeneratedByThisView(msg) {
	// const data = Utils.fieldsFromContent(msg.content, FIELDS);
	return msg.attachments.size === 1; /*(
		msg.attachments.size === 1 &&
		((data.dumpMsgUrl && data.dumpUrl && data.authorMention) || msg.content.length === 0)
	);*/
}
