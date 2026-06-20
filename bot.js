const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================= 管理员 =================
const ADMIN_ID = 8302819145;
const GROUP_ID = process.env.GROUP_ID;

// ================= 数据 =================
let users = {};          // id -> balance
let usernames = {};      // id -> username
let bets = {};
let status = "RUN";

// ================= 初始化余额 =================
function getBalance(id) {
  if (!users[id]) users[id] = 1000;
  return users[id];
}

function addBalance(id, amount) {
  if (!users[id]) users[id] = 1000;
  users[id] += amount;
}

// ================= 获取用户名 =================
function getName(ctx) {
  const id = ctx.from.id;
  const name = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name;

  usernames[id] = name;
  return name;
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
  const name = getName(ctx);

  ctx.reply(
`🎰 欢迎进入中文赌场系统

👤 用户：${name}
💰 余额：${getBalance(id)}

请选择功能：`,
    menu
  );
});

// ================= 查余额 =================
bot.hears("💰 查余额", (ctx) => {
  const id = ctx.from.id;
  const name = getName(ctx);

  ctx.reply(`👤 ${name}\n💰 当前余额：${getBalance(id)}`);
});

// ================= 帮助 =================
bot.hears("📜 帮助", (ctx) => {
  ctx.reply(
`🎮 玩法：

下注：
大100 / 小100 / 单100 / 双100

系统自动开奖

💡 初始余额：1000`
  );
});

// ================= 启动 =================
bot.hears("🎰 启动", (ctx) => {
  ctx.reply("🎰 已启动下注阶段（系统运行中）");
});

// ================= 暂停 =================
bot.hears("⛔ 暂停", (ctx) => {
  ctx.reply("⛔ 系统暂停（仅显示，不影响运行逻辑）");
});

// ================= 排行榜（简化版） =================
bot.hears("📊 排行榜", (ctx) => {
  let list = Object.entries(users)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, bal], i) => `${i + 1}. ${usernames[id] || id} - ${bal}`)
    .join("\n");

  ctx.reply("🏆 排行榜：\n" + list);
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

    const bigSmall = v >= 4 ? "DA" : "XIAO";
    const danShuang = v % 2 === 0 ? "SHUAN" : "DAN";

    await bot.telegram.sendMessage(
      GROUP_ID,
`🎲结果：${v}
📊大小：${bigSmall === "DA" ? "大" : "小"}
📊单双：${danShuang === "DAN" ? "单" : "双"}`
    );

    for (let id in bets) {
      const b = bets[id];
      const name = usernames[id] || id;

      const win = b.type === bigSmall || b.type === danShuang;

      if (win) addBalance(id, b.amount * 2);

      await bot.telegram.sendMessage(
        GROUP_ID,
        win
          ? `🎉 ${name} 赢 +${b.amount * 2}\n💰余额：${getBalance(id)}`
          : `💔 ${name} 输 -${b.amount}\n💰余额：${getBalance(id)}`
      );
    }

    bets = {};
    await sleep(5000);
  }
}

// ================= 管理员加余额 =================
bot.command("加", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const args = ctx.message.text.split(" ");
  const target = args[1];
  const amount = Number(args[2]);

  const id = Object.keys(usernames).find(k => usernames[k] === target || usernames[k] === "@" + target);

  if (!id) return ctx.reply("❌找不到用户，请让他先 /start");

  addBalance(id, amount);
  ctx.reply(`✅已给 ${target} +${amount}`);
});

// ================= 启动 =================
bot.launch();
console.log("🤖 中文赌场完整版已启动");

loop();
