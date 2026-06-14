require("dotenv").config({ path: "./config.env" });
const { Telegraf } = require("telegraf");

console.log("🤖 bot starting...");

const bot = new Telegraf(process.env.BOT_TOKEN);

let chats = new Set();
let running = true;

// 记录群
bot.on("message", (ctx) => {
  if (ctx.chat && ctx.chat.type.includes("group")) {
    chats.add(ctx.chat.id);
  }
});

// 开启
bot.command("startdice", (ctx) => {
  if (ctx.from.id != process.env.ADMIN_ID) return;
  running = true;
  ctx.reply("🎲 自动骰子已开启");
});

// 关闭
bot.command("stopdice", (ctx) => {
  if (ctx.from.id != process.env.ADMIN_ID) return;
  running = false;
  ctx.reply("⛔ 自动骰子已关闭");
});

// 🎲 定时发送骰子
setInterval(() => {
  if (!running) return;

  chats.forEach(chatId => {
    bot.telegram.sendDice(chatId);
  });

}, parseInt(process.env.INTERVAL) * 1000);

bot.launch();
console.log("🤖 bot running...");


