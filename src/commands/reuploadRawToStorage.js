import { channels, storage } from '../globals.js';
import { getMessageOptions } from '../msgTypes/gifStorageUrl.js';
import { getAllChannelMsgs } from '../utils.js';

export async function action(interaction) {
	await interaction.reply({ content: 'Reuploading...', ephemeral: true });
	const raw = channels.find((c) => c.name === 'raw-gifs');
	const msgs = await getAllChannelMsgs(raw);
	for (const msg of msgs.values()) {
		if (msg.attachments.size !== 1) console.error(msg);
		const att = msg.attachments.first();
		// console.log(att.url);
		await storage.send({ content: '', files: [att.url] });
	}

	// const urlToMsgId = {};
	// for (const url of URLS) {
	// 	const msg = await storage.send({ content: '', files: [url] });
	// 	console.log(JSON.stringify([url, msg.id]));
	// 	urlToMsgId[url] = msg.id;
	// }
	// for (const [url, imgurl] of imgur) {
	// 	let realUrl;
	// 	if (url.includes('media.giphy.com')) {
	// 		const gid = url.split('/')[4];
	// 		realUrl = 'https://giphy.com/gifs/' + gid;
	// 	} else realUrl = url;
	// 	const msg = await storage.send(getMessageOptions({ storageUrl: imgurl, dumpUrl: realUrl }));
	// 	console.log(JSON.stringify([url, msg.id]));
	// 	urlToMsgId[url] = msg.id;
	// }
	// console.log(JSON.stringify(urlToMsgId));
}
