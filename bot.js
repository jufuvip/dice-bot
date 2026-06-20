const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================= 配置 =================
const ADMIN_ID = Number(process.env.ADMIN_ID);
const GROUP_ID = process.env.GROUP_ID;

// ================= 数据 =================
let users = {};
let bets = {};
let status = "RUN";

// ================= 工具函数 =================
function getBalance(id) {
  if (!users[id]) users[id] = 1000;
  return users[id];
}

function addBalance(id, amount) {
  if (!users[id]) users[id] = 1000;
  users[id] += amount;
}

// ================= 菜单 =================
const menu = Markup.keyboard([
  ["💰 查余额", "🎰 启动"],
  ["⛔ 暂停", "📊 排行榜"],
  ["📜 帮助"]
]).resize();

// ================= /start =================
bot.start((ctx) => {
  const id = ctx.from.id;
  ctx.reply(
`🎰 中文赌场系统

💰 当前余额：${getBalance(id)}

请选择功能👇`,
menu
  );
});

// ================= 功能按钮 =================
bot.hears("💰 查余额", (ctx) => {
  const id = ctx.from.id;
  ctx.reply(`💰 余额：${getBalance(id)}`);
});

bot.hears("📜 帮助", (ctx) => {
  ctx.reply(
`🎮 玩法：
大100 / 小100 / 单100 / 双100

💡 初始余额：1000`
  );
});

bot.hears("🎰 启动", (ctx) => {
  ctx.reply("🎰 游戏已运行");
});

bot.hears("⛔ 暂停", (ctx) => {
  ctx.reply("⛔ 已暂停（仅提示）");
});

bot.hears("📊 排行榜", (ctx) => {
  const list = Object.entries(users)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, bal], i) => `${i + 1}. ${id} - ${bal}`)
    .join("\n");

  ctx.reply("🏆排行榜：\n" + list);
});

// ================= 下注 =================
bot.on("text", (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text;

  if (status !== "RUN") return;

  let type = null;
  let amount = null;

  if (text.startsWith("大")) { type = "DA"; amount = Number(text.replace("大", "")); }
  if (text.startsWith("小")) { type = "XIAO"; amount = Number(text.replace("小", "")); }
  if (text.startsWith("单")) { type = "DAN"; amount = Number(text.replace("单", "")); }
  if (text.startsWith("双")) { type = "SHUAN"; amount = Number(text.replace("双", "")); }

  if (!type || !amount) return;

  if (getBalance(id) < amount) return ctx.reply("❌余额不足");

  addBalance(id, -amount);
  bets[id] = { type, amount };

  ctx.reply(`✅下注成功 ${type} ${amount}`);
});

// ================= 游戏循环 =================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function loop() {
  while (true) {

    status = "RUN";
    await bot.telegram.sendMessage(GROUP_ID, "🎰 开始下注（60秒）");

    await sleep(60000);

    status = "STOP";
    await bot.telegram.sendMessage(GROUP_ID, "⛔ 封盘");

    await sleep(3000);

    const msg = await bot.telegram.sendDice(GROUP_ID);
    const v = msg.dice.value;

    const big = v >= 4 ? "DA" : "XIAO";
    const dan = v % 2 === 0 ? "SHUAN" : "DAN";

    await bot.telegram.sendMessage(
      GROUP_ID,
`🎲结果：${v}
📊大小：${big === "DA" ? "大" : "小"}
📊单双：${dan === "DAN" ? "单" : "双"}`
    );

    for (let id in bets) {
      const b = bets[id];

      const win = b.type === big || b.type === dan;

      if (win) addBalance(id, b.amount * 2);

      await bot.telegram.sendMessage(
        GROUP_ID,
        win
          ? `🎉 用户${id} 赢 +${b.amount * 2}\n💰余额：${getBalance(id)}`
          : `💔 用户${id} 输 -${b.amount}\n💰余额：${getBalance(id)}`
      );
    }

    bets = {};
    await sleep(5000);
  }
}

// ================= 管理员加钱 =================
bot.command("加", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("❌无权限");
  }

  const args = ctx.message.text.split(" ");
  const target = Number(args[1]);
  const amount = Number(args[2]);

  if (!target || !amount) {
    return ctx.reply("格式：/加 用户ID 金额");
  }

  addBalance(target, amount);

  ctx.reply(`✅已加 ${target} +${amount}`);
});

// ================= 启动 =================
bot.launch();
console.log("🤖 赌场系统已启动");

loop();
