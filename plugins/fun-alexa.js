import fetch from 'node-fetch';

// Handler for the 'bot' and 'alexa' commands
let handler = async (m, { conn, text, usedPrefix, command }) => {
  const name = conn.getName(m.sender);
  if (!text) {
    throw `Hi *${name}*, do you want to talk? Respond with *${usedPrefix + command}* (your message)\n\n📌 Example: *${usedPrefix + command}* Hi bot`;
  }

  m.react('🗣️');

  try {
    const msg = encodeURIComponent(text);

    console.log(`Sending request to API with message: ${msg}`);
    const res = await fetch(`https://worker-dry-cloud-dorn.dorndickence.workers.dev/?prompt=${msg}`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    
    const json = await res.json();

    console.log('API response:', json);

    if (json.result && json.result.response) {
      let reply = json.result.response;
      m.reply(reply);
    } else {
      m.reply('Sorry, I could not get a response from the server.');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    m.reply('There was an error processing your request.');
  }
};

// Function to handle PM messages without prefix
let autoReplyPM = async (m, { conn }) => {
  const name = conn.getName(m.sender);
  const defaultReply = `Hi *${name}*, how can I assist you today?`;

  m.react('🗣️');
  m.reply(defaultReply);
};

// Register the new function to handle PM messages
conn.ev.on('messages.upsert', async (chatUpdate) => {
  const m = chatUpdate.messages[0];
  if (!m.message) return;
  
  const fromMe = m.key.fromMe;
  const isGroup = m.key.remoteJid.endsWith('@g.us');

  // Check if it's a PM and not from the bot itself
  if (!isGroup && !fromMe) {
    await autoReplyPM(m, { conn });
  }
});

handler.help = ['bot'];
handler.tags = ['fun'];
handler.command = ['bot', 'alexa'];

export default handler;


