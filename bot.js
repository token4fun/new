const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Use your bot token (preferably set as an environment variable)
const BOT_TOKEN = process.env.BOT_TOKEN || '7724572064:AAE0dApQydqMEMpyzIJMVNVU5xQO53QFZPY';
const bot = new Telegraf(BOT_TOKEN);

// Define the path to the file that will store the registered chat IDs.
const registeredChatsFile = path.join(__dirname, 'registered_chats.json');
let registeredChats = [];

// Load registered chats from file if it exists.
if (fs.existsSync(registeredChatsFile)) {
  try {
    registeredChats = JSON.parse(fs.readFileSync(registeredChatsFile, 'utf8'));
    console.log('Loaded registered chats:', registeredChats);
  } catch (error) {
    console.error('Error reading registered_chats.json:', error);
  }
} else {
  console.log('No registered_chats.json found. Starting with an empty list.');
}

// Listen for updates regarding the bot's membership in a chat.
bot.on('my_chat_member', (ctx) => {
  const update = ctx.update.my_chat_member;
  const chat = update.chat;
  const newStatus = update.new_chat_member.status;

  // We only want to register group chats (or supergroups).
  if (chat.type === 'group' || chat.type === 'supergroup') {
    // Optionally, you can check for specific statuses (e.g., 'administrator' or 'member').
    if (newStatus === 'administrator' || newStatus === 'member') {
      // If this chat ID isn't already registered, add it.
      if (!registeredChats.includes(chat.id)) {
        registeredChats.push(chat.id);
        // Save the updated registered chats array to the file.
        fs.writeFileSync(registeredChatsFile, JSON.stringify(registeredChats, null, 2));
        console.log(`Registered new chat: ${chat.id} (${chat.title || chat.username || 'unknown'})`);
      }
    }
  }
});

// Start the bot
bot.launch().then(() => {
  console.log('Bot launched and listening for membership updates...');
});

// Graceful shutdown handling
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
