const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');

const BOT_TOKEN = "ISI_TOKEN_BOTFATHER_LU";
const OWNER_ID = 123456789; // ID TELE LU

const load = (f) => { try { return JSON.parse(fs.readFileSync(f)) } catch { return [] } };
const save = (f,d) => fs.writeFileSync(f, JSON.stringify(d,null,2));
if(!fs.existsSync('tokens.json')) save('tokens.json',[]);

const bot = new Telegraf(BOT_TOKEN);

// --- KEYBOARD MENU ---
const menu = Markup.inlineKeyboard([
  [Markup.button.callback('➕ Add Token', 'add'), Markup.button.callback('📋 List', 'list')],
  [Markup.button.callback('✅ Cek Valid', 'check'), Markup.button.callback('🗑️ Clean Invalid', 'clean')],
  [Markup.button.callback('📤 Export', 'export'), Markup.button.callback('📊 Stats', 'stats')]
]);

bot.start((ctx) => ctx.reply(`🤖 *BOT SULTAN MANAGER*\nPilih menu dibawah bos:`, {parse_mode:'Markdown',...menu}));

bot.action('add', (ctx) => ctx.reply('Kirim tokennya gini:\n`/addtoken 123456:AAHxxx`'));
bot.action('list', (ctx) => {
  let t=load('tokens.json');
  if(!t.length) return ctx.reply('Kosong bos []');
  ctx.reply(`Total ${t.length} token\nKetik /listtoken buat detail`);
});
bot.action('stats', (ctx) => {
  let t=load('tokens.json');
  ctx.reply(`📊 STATS\n\nTotal Token: ${t.length}\nOwner: ${load('owner.json').length}\nMod: ${load('moderator.json').length}\nUptime: ${process.uptime().toFixed(0)}s`);
});
bot.action('check', async (ctx) => {
  ctx.reply('⏳ Ngecek token valid...');
  let tokens=load('tokens.json'), valid=0, invalid=0;
  for(let token of tokens){
    try{
      let res=await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r=>r.json());
      if(res.ok) valid++; else invalid++;
    }catch{ invalid++; }
  }
  ctx.reply(`✅ Valid: ${valid}\n❌ Invalid: ${invalid}\nTotal: ${tokens.length}`);
});
bot.action('clean', async (ctx) => {
  ctx.reply('🧹 Bersihin token mati...');
  let tokens=load('tokens.json'), newTokens=[];
  for(let token of tokens){
    try{
      let res=await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r=>r.json());
      if(res.ok) newTokens.push(token);
    }catch{}
  }
  save('tokens.json', newTokens);
  ctx.reply(`Selesai! Dihapus ${tokens.length - newTokens.length} token mati\nSisa: ${newTokens.length}`);
});
bot.action('export', (ctx) => {
  ctx.replyWithDocument({source:'tokens.json', filename:'backup-tokens.json'}, {caption:'📤 Backup tokens.json'});
});

// --- COMMANDS ---
bot.command('addtoken', (ctx) => {
  let token=ctx.message.text.split(' ')[1];
  if(!token) return ctx.reply('Format: /addtoken TOKEN');
  let t=load('tokens.json');
  if(t.includes(token)) return ctx.reply('Udah ada bos!');
  t.push(token); save('tokens.json',t);
  ctx.reply(`✅ Ditambah! Total: ${t.length}`, menu);
});
bot.command('listtoken', (ctx) => {
  let t=load('tokens.json');
  if(!t.length) return ctx.reply('Kosong');
  ctx.reply(t.map((x,i)=>`${i+1}. ${x.slice(0,20)}...`).join('\n').slice(0,4000));
});
bot.command('deltoken', (ctx) => {
  let n=parseInt(ctx.message.text.split(' ')[1])-1;
  let t=load('tokens.json');
  t.splice(n,1); save('tokens.json',t);
  ctx.reply(`Dihapus, sisa ${t.length}`);
});
bot.command('addmod', (ctx) => {
  let owner=load('owner.json');
  if(!owner.includes(ctx.from.id)) return;
  let id=parseInt(ctx.message.text.split(' ')[1]);
  let mod=load('moderator.json'); mod.push(id); save('moderator.json',[...new Set(mod)]);
  ctx.reply(`Mod ${id} ditambah`);
});
bot.command('broadcast', (ctx) => {
  let msg=ctx.message.text.split(' ').slice(1).join(' ');
  ctx.reply(`[BROADCAST SIMULASI]: ${msg}\nKe ${load('tokens.json').length} token`);
});

// --- WEB + BOT JALAN BARENG (ANTI BAD GATEWAY) ---
const app = express();
app.use(express.json());
app.use(express.static('.')); // biar addtoken.html kebaca
app.get('/', (req,res) => res.send(`Bot jalan! Total token: ${load('tokens.json').length} <br><a href="/addtoken.html">Buka Panel</a>`));
app.get('/api/tokens', (req,res) => res.json(load('tokens.json')));
app.listen(4086, () => console.log('WEB: http://0.0.0.0:4086'));

bot.launch().then(()=> console.log('BOT + WEB JALAN BOS!'));
