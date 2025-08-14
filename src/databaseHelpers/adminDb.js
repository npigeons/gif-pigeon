import { getDataFromMsg } from '../channels/admin.js';
import { getGif, noGifWarning } from '../database.js';
import { syncWarning } from '../channels/logs.js';

const json = JSON.stringify;

export function msgCreated(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (!gif) {
		if (data.isNoGifWarning) noGifWarning[data.dumpMsgUrl] = msg.id;
		else syncWarning(`No GIF found for Admin msg: ${json(data)}`);
		return;
	}

	if (data.isTagProposition) gif.tagsSuggestions.push(data);
	else if (data.isNoGifWarning) syncWarning(`noGifWarning with an assigned GIF: ${msg.url}`);
	else if (!data.isApproveMsg && !data.isReuploadMsg && !data.isEditTagsMsg)
		syncWarning(`unknown type of message in Admin: ${msg.url}`);

	gif.registerInDb(data, msg);
}

export function msgDeleted(msg) {
	const data = getDataFromMsg(msg);
	const gif = getGif(data);
	if (!gif) {
		if (data.isNoGifWarning) delete noGifWarning[data.dumpMsgUrl];
		return;
	}

	if (data.isApproveMsg) delete gif.approveMsgId;
	else if (data.isReuploadMsg) delete gif.reuploadMsgId;
	else if (data.isEditTagsMsg) delete gif.editTagsMsgId;
	else if (data.isTagProposition) {
		gif.tagsSuggestions = gif.tagsSuggestions.filter((x) => x.msgId !== msg.id);
	}
}

export function msgUpdated(oldMsg, newMsg) {
	msgDeleted(oldMsg);
	msgCreated(newMsg);
}
