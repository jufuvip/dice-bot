require("dotenv").config({ path: "./config.env" });
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== 积分数据库（先内存版）=====
const users = {};

// 默认积分
function getUser(id) {
  if (!users[id]) users[id] = 1000;
  return users[id];
}

// 骰子
function roll() {
  return Math.floor(Math.random() * 6) + 1;
}

// 判断输赢
function checkWin(bet, result) {
  if (bet === "单") return [1,3,5].includes(result);
  if (bet === "双") return [2,4,6].includes(result);
  if (bet === "大") return [4,5,6].includes(result);
  if (bet === "小") return [1,2,3].includes(result);
  return false;
}

// ===== 下注 =====
bot.on("text", (ctx) => {
  const text = ctx.message.text;
  const id = ctx.from.id;

  const parts = text.split(" ");

  if (parts.length !== 2) return;

  const bet = parts[0];
  const amount = parseInt(parts[1]);

  if (!["单","双","大","小"].includes(bet)) return;
  if (isNaN(amount)) return;

  const balance = getUser(id);

  if (balance < amount) {
    return ctx.reply("❌ 积分不够");
  }

  const result = roll();
  const win = checkWin(bet, result);

  if (win) {
    users[id] += amount;
  } else {
    users[id] -= amount;
  }

  ctx.reply(
`🎲 点数：${result}
${win ? "🎉 赢 +" : "💥 输 -"}${amount}
💰 当前积分：${users[id]}`
  );
});

// ===== 查询积分 =====
bot.command("score", (ctx) => {
  const id = ctx.from.id;
  ctx.reply(`💰 你的积分：${getUser(id)}`);
});

bot.launch();
console.log("🤖 bot running...");

