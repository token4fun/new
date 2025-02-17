// ---------- Required Modules ----------
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Express Setup ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// ---------- Telegram Bot Setup ----------
const BOT_TOKEN = process.env.BOT_TOKEN || '7724572064:AAE0dApQydqMEMpyzIJMVNVU5xQO53QFZPY';
const bot = new Telegraf(BOT_TOKEN);

// Path to file where we store registered chat IDs
const registeredChatsFile = path.join(__dirname, 'registered_chats.json');
let registeredChats = [];

// Load registered chats if file exists
if (fs.existsSync(registeredChatsFile)) {
  try {
    registeredChats = JSON.parse(fs.readFileSync(registeredChatsFile, 'utf8'));
    console.log('Registered chats loaded:', registeredChats);
  } catch (err) {
    console.error('Error reading registered chats file:', err);
  }
} else {
  console.log('No registered chats file found. Starting fresh.');
}

// Listen for my_chat_member updates to register new chats
bot.on('my_chat_member', (ctx) => {
  const chat = ctx.update.my_chat_member.chat;
  const newStatus = ctx.update.my_chat_member.new_chat_member.status;
  
  // For example, register if the bot is added as "administrator" or "member" in a group
  if ((newStatus === 'administrator' || newStatus === 'member') && chat.type !== 'private') {
    if (!registeredChats.includes(chat.id)) {
      registeredChats.push(chat.id);
      // Save the updated array to file
      fs.writeFileSync(registeredChatsFile, JSON.stringify(registeredChats, null, 2));
      console.log(`Registered new chat: ${chat.id} (${chat.title || chat.username || 'unknown group'})`);
    }
  }
});

// Optionally, listen to messages in private chats (if desired)
// bot.on('message', (ctx) => {
//   // Do something for private messages...
// });

// Launch the bot
bot.launch().then(() => {
  console.log('Telegram bot is running.');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ---------- Example Notification Function ----------
async function sendNotificationToRegisteredChats(messageText) {
  // Use the same BOT_TOKEN from earlier
  for (const chatId of registeredChats) {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&parse_mode=Markdown&text=${encodeURIComponent(messageText)}`;
    try {
      const response = await fetch(telegramUrl);
      const data = await response.json();
      if (data.ok) {
        console.log(`Notification sent to chat ${chatId}`);
      } else {
        console.error(`Error sending notification to chat ${chatId}:`, data);
      }
    } catch (error) {
      console.error(`Request error sending notification to chat ${chatId}:`, error);
    }
  }
}

// ---------- Your Existing Code for Monitoring Transactions ----------
// Here, include the code you already have (from your index.html logic or moved to the backend)
// For example, you might call sendNotificationToRegisteredChats() whenever a new token is detected.

