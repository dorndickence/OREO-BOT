import fetch from 'node-fetch';

// Utility to count tokens (simplified)
const countTokens = (text) => text.split(/\s+/).length;

const MAX_TOKENS = 4097; // For GPT-3 Davinci

// Store conversations in memory (consider using a database for persistence)
let conversationMemory = {};

const getTruncatedHistory = (history, newMessage, maxTokens) => {
  let totalTokens = countTokens(newMessage);
  const truncatedHistory = [];

  // Iterate from the end to the beginning
  for (let i = history.length - 1; i >= 0; i--) {
    const { message, response } = history[i];
    const messageTokens = countTokens(message);
    const responseTokens = countTokens(response);

    // Check if adding this message/response would exceed the max tokens
    if (totalTokens + messageTokens + responseTokens > maxTokens) {
      break; // Stop adding when max tokens would be exceeded
    }

    truncatedHistory.unshift({ message, response });
    totalTokens += messageTokens + responseTokens;
  }

  return truncatedHistory;
};

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const name = conn.getName(m.sender);

  // Restrict prefix and command usage to group chats
  if (m.isGroup && !text) {
    throw `Hi *${name}*, do you want to talk? Respond with *${usedPrefix + command}* (your message)\n\n📌 Example: *${usedPrefix + command}* Hi dornkimb`;
  } else if (!m.isGroup && command) {
    throw `The prefix and command are only for group chats.`;
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

    // Store conversation in memory
    if (!conversationMemory[m.sender]) {
      conversationMemory[m.sender] = [];
    }

    // Get truncated history to ensure token limit is respected
    conversationMemory[m.sender] = getTruncatedHistory(conversationMemory[m.sender], text, MAX_TOKENS);

    // Add the latest message and response to the memory
    conversationMemory[m.sender].push({ message: text, response: reply });

    m.reply(reply);
  } catch (error) {
    m.reply(`An error occurred: ${error.message}`);
  }
}

handler.help = ['bot'];
handler.tags = ['fun'];
handler.command = ['bot', 'gpt'];

export default handler;
