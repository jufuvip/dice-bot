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
bot.on("text", (ctx) => {
  const text = ctx.message.text.trim();
  const id = ctx.from.id;

  let amount = text.match(/\d+/);
  if (!amount) return;
  amount = parseInt(amount[0]);

  const balance = getUser(id);
  if (balance < amount) return ctx.reply("❌ 积分不足");

  const result = roll();
  let win = false;
  let type = "";

  // ===== 大小 =====
  if (/^da|^大/.test(text)) {
    win = [4,5,6].includes(result);
    type = "大";
  }
  else if (/^x|^小/.test(text)) {
    win = [1,2,3].includes(result);
    type = "小";
  }

  // ===== 单双 =====
  else if (/^dan|^单|^s/.test(text)) {
    win = [1,3,5].includes(result);
    type = "单";
  }
  else if (/^shuang|^双/.test(text)) {
    win = [2,4,6].includes(result);
    type = "双";
  }

  // ===== 组合 =====
  else if (/dd|大单/.test(text)) {
    win = (result >= 4 && result % 2 === 1);
    type = "大单";
  }
  else if (/ds|大双/.test(text)) {
    win = (result >= 4 && result % 2 === 0);
    type = "大双";
  }
  else if (/xd|小单/.test(text)) {
    win = (result <= 3 && result % 2 === 1);
    type = "小单";
  }
  else if (/xs|小双/.test(text)) {
    win = (result <= 3 && result % 2 === 0);
    type = "小双";
  }

  // ===== 特码（定位胆）=====
  else if (/dwd|定位胆|y/.test(text)) {
    const guess = parseInt(text.match(/\d/)[0]);
    win = guess === result;
    type = "特码";
  }

  if (!type) return;

  if (win) {
    users[id] += amount;
  } else {
    users[id] -= amount;
  }

  ctx.reply(
`🎲 开骰：${result}
🎯 类型：${type}
${win ? "🎉 赢 +" : "💥 输 -"}${amount}
💰 积分：${users[id]}`
  );
});

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

bot.launch({
  dropPendingUpdates: true
});.then(() => {
  console.log("🤖 bot running...");
}).catch((err) => {
  console.log("启动失败：", err);
});
