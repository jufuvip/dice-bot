const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = Number(process.env.ADMIN_ID);
const GROUP_ID = process.env.GROUP_ID;

// ================= 数据 =================
let users = {};
let bets = {};
let status = "下注中";

// ================= 积分系统 =================
function getUser(id) {
  if (!users[id]) users[id] = 1000;
  return users[id];
}

function addUser(id, amount) {
  if (!users[id]) users[id] = 1000;
  users[id] += amount;
}

// ================= 中文映射 =================
function parseBet(text) {
  if (text.startsWith("大")) return { type: "大", amount: Number(text.replace("大", "")) };
  if (text.startsWith("小")) return { type: "小", amount: Number(text.replace("小", "")) };
  if (text.startsWith("单")) return { type: "单", amount: Number(text.replace("单", "")) };
  if (text.startsWith("双")) return { type: "双", amount: Number(text.replace("双", "")) };
  return null;
}

// ================= /start =================
bot.start((ctx) => {
  const id = ctx.from.id;
  ctx.reply(
`🎰 欢迎来到中文赌场

💰 当前积分：${getUser(id)}

🎮 玩法：
大100 / 小100 / 单100 / 双100

或 /bet 大 100`
  );
});

// ================= 查积分 =================
bot.command("积分", (ctx) => {
  const id = ctx.from.id;
  ctx.reply(`💰 你的积分：${getUser(id)}`);
});

// ================= 下注（全中文） =================
bot.on("text", (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text;

  if (status !== "下注中") return;

  let bet = parseBet(text);

  // 兼容 /bet 大 100
  if (!bet && text.startsWith("/bet")) {
    const args = text.split(" ");
    const map = { DA: "大", XIAO: "小", DAN: "单", SHUAN: "双" };
    bet = {
      type: map[args[1]?.toUpperCase()] || args[1],
      amount: Number(args[2])
    };
  }

  if (!bet || !bet.type || !bet.amount) return;

  if (getUser(id) < bet.amount) return ctx.reply("❌ 积分不足");

  addUser(id, -bet.amount);
  bets[id] = bet;

  ctx.reply(`✅ 下注成功：${bet.type} ${bet.amount}`);
});

// ================= 游戏循环 =================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function loop() {
  while (true) {

    status = "下注中";
    await bot.telegram.sendMessage(GROUP_ID, "🎰 开始下注（60秒）");

    await sleep(60000);

    status = "封盘";
    await bot.telegram.sendMessage(GROUP_ID, "⛔ 已封盘");

    await sleep(3000);

    const msg = await bot.telegram.sendDice(GROUP_ID);
    const v = msg.dice.value;

    const resultBigSmall = v >= 4 ? "大" : "小";
    const resultDanShuang = v % 2 === 0 ? "双" : "单";

    await bot.telegram.sendMessage(
      GROUP_ID,
`🎲 开奖结果：${v}
📊 大小：${resultBigSmall}
📊 单双：${resultDanShuang}`
    );

    // ================= 结算 =================
    for (let id in bets) {
      const b = bets[id];

      const win =
        b.type === resultBigSmall ||
        b.type === resultDanShuang;

      if (win) addUser(id, b.amount * 2);

      const name = `用户${id}`;

      await bot.telegram.sendMessage(
        GROUP_ID,
        win
          ? `🎉 ${name} 赢了 +${b.amount * 2}`
          : `💔 ${name} 输了 -${b.amount}`
      );
    }

    bets = {};
    await sleep(5000);
  }
}

// ================= 启动 =================
bot.launch();
console.log("🤖 中文赌场系统已启动");

loop();
