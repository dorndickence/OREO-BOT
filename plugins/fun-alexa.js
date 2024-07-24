import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const name = conn.getName(m.sender);

  if (!text) {
    throw `Hi *${name}*, do you want to talk? Respond with *${usedPrefix + command}* (your message)\n\n📌 Example: *${usedPrefix + command}* Hi dornkimb`;
  }

  m.react('🗣️');

  const msg = encodeURIComponent(text);

  try {
    const res = await fetch(`https://worker-dry-cloud-dorn.dorndickence.workers.dev/?prompt=${msg}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch response: ${res.statusText}`);
    }

    const json = await res.json();

    if (!json.response || !json.response.response) {
      throw new Error('Invalid response from the API');
    }

    let reply = json.response.response;
    m.reply(reply);
  } catch (error) {
    m.reply(`An error occurred: ${error.message}`);
  }
}

handler.help = ['bot'];
handler.tags = ['fun'];
handler.command = ['bot', 'gpt'];

export default handler;
