export function getDataFromMsg(msg) {
	return { mainUrl: msg.content };
}

export function isMsgGeneratedByThisView(msg) {
	return msg.content.split(' ').length == 1 && msg.content.startsWith('https://');
}

export function getMessageOptions(gif) {
	return { content: gif.mainUrl };
}
