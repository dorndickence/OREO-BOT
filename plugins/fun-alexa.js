import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';

// MongoDB setup
const uri = 'mongodb+srv://dornbots:5s3Tcs9RdPqLTmij@dornbot.clhjn5v.mongodb.net/Workerchats?retryWrites=true&w=majority';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'chatbot';
const collectionName = 'conversations';

// Utility to count tokens (simplified)
const countTokens = (text) => text.split(/\s+/).length;

const MAX_TOKENS = 1024; // For GPT-3 Davinci

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

  // Check if the message is from a group or private chat
  const isGroupChat = m.isGroup;

  // Define prefix and command
  const commandPrefix = '!';
  const commandName = 'bot';

  // Extract text and handle prefix and command in group chats
  let messageText = text;

  if (isGroupChat) {
    if (messageText.startsWith(commandPrefix)) {
      messageText = messageText.slice(commandPrefix.length).trim();
      if (messageText.startsWith(commandName)) {
        messageText = messageText.slice(commandName.length).trim();
      } else {
        return;
      }
    } else {
      return;
    }
  }

  if (!messageText) {
    throw `Hi *${name}*, do you want to talk? Respond with *${usedPrefix + commandName}* (your message)\n\n📌 Example: *${usedPrefix + commandName}* Hi dornkimb`;
  }

  m.react('🗣️');

  const msg = encodeURIComponent(messageText);

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

    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Fetch conversation history from MongoDB
    const userConversation = await collection.findOne({ userId: m.sender });

    // Initialize conversation memory if not present
    let conversationHistory = userConversation ? userConversation.history : [];

    // Get truncated history to ensure token limit is respected
    conversationHistory = getTruncatedHistory(conversationHistory, messageText, MAX_TOKENS);

    // Add the latest message and response to the history
    conversationHistory.push({ message: messageText, response: reply });

    // Update the conversation history in MongoDB
    await collection.updateOne(
      { userId: m.sender },
      { $set: { history: conversationHistory } },
      { upsert: true }
    );

    m.reply(reply);
  } catch (error) {
    m.reply(`An error occurred: ${error.message}`);
  } finally {
    await client.close();
  }
}

handler.help = ['bot'];
handler.tags = ['fun'];
handler.command = ['bot', 'gpt'];

export default handler;
