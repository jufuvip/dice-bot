const { Telegraf } = require('telegraf');
require('dotenv').config();

// ===== 防止重复启动 =====
if (global.__casino_running) {
  console.log("⚠️ bot already running");
  process.exit();
}
global.__casino_running = true;

// ===== 初始化 =====
const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);
const GROUP_ID = process.env.GROUP_ID;

// ===== 数据 =====
let users = {};
let bets = {};
let status = "betting";
let userMap = {}; // 存昵称

// ===== 积分 =====
function getUser(id) {
  if (!users[id]) users[id] = 1000;
  return users[id];
}

function addUser(id, amount) {
  if (!users[id]) users[id] = 1000;
  users[id] += amount;
}

// ===== 日志 =====
bot.use((ctx, next) => {
  console.log("📩", ctx.message?.text);
  return next();
});

// ===== /start =====
bot.start((ctx) => {
  const id = ctx.from.id;

  userMap[id] = ctx.from.username || ctx.from.first_name;

  ctx.reply(`🎰赌场启动\n💰积分：${getUser(id)}`);
});

// ===== 查积分 =====
bot.command("积分", (ctx) => {
  const id = ctx.from.id;
  ctx.reply(`💰积分：${getUser(id)}`);
});

// ===== 下注（支持 /bet + 中文）=====
bot.on("text", (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text;

  if (status !== "betting") return;

  let type = null;
  let amount = null;

  // /bet DA 100
  if (text.startsWith("/bet")) {
    const args = text.split(" ");
    type = (args[1] || "").toUpperCase();
    amount = Number(args[2]);
  }

  // 中文下注
  if (text.startsWith("大")) {
    type = "DA";
    amount = Number(text.replace("大", ""));
  }
  if (text.startsWith("小")) {
    type = "XIAO";
    amount = Number(text.replace("小", ""));
  }
  if (text.startsWith("单")) {
    type = "DAN";
    amount = Number(text.replace("单", ""));
  }
  if (text.startsWith("双")) {
    type = "SHUAN";
    amount = Number(text.replace("双", ""));
  }

  if (!type || !amount) return;
  if (!["DA", "XIAO", "DAN", "SHUAN"].includes(type)) return;

  if (getUser(id) < amount) return ctx.reply("❌积分不足");

  addUser(id, -amount);
  bets[id] = { type, amount };

  ctx.reply(`✅下注成功 ${type} ${amount}`);
});

// ===== 管理员加分 =====
bot.command("add", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌无权限");

  const args = ctx.message.text.split(" ");
  const target = args[1];
  const amount = Number(args[2]);

  addUser(target, amount);
  ctx.reply(`✅已加分`);
});

// ===== 延迟 =====
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ===== 游戏循环 =====
async function loop() {
  while (true) {

    // 开始下注
    status = "betting";
    await bot.telegram.sendMessage(GROUP_ID, "🎰 开始下注（60秒）");

    await sleep(60000);

    // 封盘
    status = "closed";
    await bot.telegram.sendMessage(GROUP_ID, "⛔ 已封盘");

    await sleep(3000);

    // 官方骰子
    const msg = await bot.telegram.sendDice(GROUP_ID);
    const v = msg.dice.value;

    const bigSmall = v >= 4 ? "DA" : "XIAO";
    const danShuang = v % 2 === 0 ? "SHUAN" : "DAN";

    await bot.telegram.sendMessage(
      GROUP_ID,
      `🎲结果：${v}\n📊大小：${bigSmall}\n📊单双：${danShuang}`
    );

    // ===== 群内结算（你要的版本）=====
    for (let id in bets) {
      const b = bets[id];

      let win = false;

      if (b.type === bigSmall || b.type === danShuang) {
        addUser(id, b.amount * 2);
        win = true;
      }

      const name = userMap[id] || id;

      await bot.telegram.sendMessage(
        GROUP_ID,
        win
          ? `🎉 @${name} 赢了 +${b.amount * 2}\n💰积分：${getUser(id)}`
          : `💔 @${name} 输了 -${b.amount}\n💰积分：${getUser(id)}`
      );
    }

    bets = {};

    await sleep(5000);
  }
}

// ===== 启动 =====
bot.launch();
console.log("🤖 casino bot running...");

loop();
