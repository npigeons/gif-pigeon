export async function tryToDelete(channel, msgId) {
	if (!msgId) return;
	try {
		await channel.messages.delete(msgId);
	} catch (e) {
		console.log(`failed to delete msg ${msgId} from ${channel.name}`);
	}
}
