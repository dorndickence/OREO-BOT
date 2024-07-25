import fetch from 'node-fetch';
import mongoose from 'mongoose';

// Connect to MongoDB using URL
const mongoURL = 'your_mongodb_url_here';
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
  const name = m.sender;

  if (!m.text) {
    throw `Hi *${name}*, do you want to talk? Just send me a message.`;
  }

  m.react('🗣️');

  const msg = encodeURIComponent(m.text);

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

    // Fetch or create a conversation entry in MongoDB
    let conversation = await Conversation.findOne({ sender: m.sender });
    if (!conversation) {
      conversation = new Conversation({ sender: m.sender, history: [] });
    }

    // Get truncated history to ensure token limit is respected
    conversation.history = getTruncatedHistory(conversation.history, m.text, MAX_TOKENS);

    // Add the latest message and response to the history
    conversation.history.push({ message: m.text, response: reply });

    // Save the conversation to MongoDB
    await conversation.save();

    m.reply(reply);
  } catch (error) {
    m.reply(`An error occurred: ${error.message}`);
  }
}

// Exporting the handler for the bot
export default handler;
