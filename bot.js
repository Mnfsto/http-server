'use strict';
const TOKEN = process.env.BOT_TOKEN;

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  bot.sendMassage(chatId, resp);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log(chatId);
  bot.sendMessage(chatId, 'Received your message');
});

module.exports = { bot };
