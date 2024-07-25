import fetch from 'node-fetch';
import mongoose from 'mongoose';

// MongoDB connection URL
const mongoURL = 'mongodb+srv://dornbots:5s3Tcs9RdPqLTmij@dornbot.clhjn5v.mongodb.net/Workerchats?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a schema and model for storing conversations
const conversationSchema = new mongoose.Schema({
  sender: String,
  history: [
    {
      message: String,
      response: String,
    },
  ],
});

// Create a model for conversations
const Conversation = mongoose.model('Conversation', conversationSchema);

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

let handler = async (m) => {
  console.log('Message received:', m.text);

  // Check if the message is from a group or private chat
  const isGroupChat = m.isGroup;

  // Check for command prefix if in group chat
  const commandPrefix = isGroupChat ? '!' : ''; // Adjust your prefix here
  const command = 'bot'; // Example command

  // Extract text and check for command in group chats
  let text = m.text;

  if (isGroupChat && text.startsWith(commandPrefix)) {
    // Remove prefix and command from the text
    text = text.slice(commandPrefix.length + command.length).trim();
  } else if (isGroupChat) {
    // Ignore messages that don't start with the command prefix in group chats
    return;
  }

  if (!text) {
    console.log('No text in the message');
    return;
  }

  const name = m.sender;
  const msg = encodeURIComponent(text);

  try {
    console.log('Fetching response for:', msg);
    const res = await fetch(`https://worker-dry-cloud-dorn.dorndickence.workers.dev/?prompt=${msg}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch response: ${res.statusText}`);
    }

    const json = await res.json();

    if (!json.response || !json.response.response) {
      throw new Error('Invalid response from the API');
    }

    let reply = json.response.response;
    console.log('API response:', reply);

    // Fetch or create a conversation entry in MongoDB
    let conversation = await Conversation.findOne({ sender: m.sender });
    if (!conversation) {
      conversation = new Conversation({ sender: m.sender, history: [] });
    }

    // Get truncated history to ensure token limit is respected
    conversation.history = getTruncatedHistory(conversation.history, text, MAX_TOKENS);

    // Add the latest message and response to the history
    conversation.history.push({ message: text, response: reply });

    // Save the conversation to MongoDB
    await conversation.save();
    console.log('Conversation saved to MongoDB');

    m.reply(reply);
    console.log('Replied to message');
  } catch (error) {
    console.error('Error occurred:', error);
    m.reply(`An error occurred: ${error.message}`);
  }
};

// Exporting the handler for the bot
export default handler;