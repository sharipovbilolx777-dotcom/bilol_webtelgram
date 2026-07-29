

const { Telegraf, Markup } = require('telegraf');


const BOT_TOKEN = '7993407351:AAE4ORrWoe-16bO6rs6FFMGx5cC_5ofMeOA';
const ADMIN_ID = 5148047459;


const bot = new Telegraf(BOT_TOKEN);





const userState = {};

const langData = {
  uz: {
    btn_book: "🚖 Йўловчи 🤵",
    btn_parcel: "📦 Почта 📬",
    btn_benefits: "💵 Нархлар 💵",
    btn_contact: "📞 Алоқа",
    
    ask_route: "📍 Қаердан қаерга?",
    route_1: "Намангандан ➡️ Тошкентга",
    route_2: "Тошкентдан ➡️ Наманганга",

    ask_datetime: "📅 Қачонга бормоқчисиз?\n\nМисол: <code>30.07.2026 08:00</code>",
    error_datetime: "❌ Сана ва вақт формати нотўғри.\nМисол: <code>30.07.2026 08:00</code>",
    
    ask_passengers: "👥 Нечта киши?",
    btn_empty_car: "Бўш машина 🚕",
    error_passengers: "❌ Илтимос, тугмалардан бирини танланг.",
    
    ask_fullname: "👤 Исм ва фамилиянгизни киритинг:",
    error_fullname: "❌ Илтимос, фақат ҳарфлардан фойдаланинг.",
    
    ask_phone: "📞 Телефон рақамингизни юборинг:",
    btn_send_contact: "Рақамимни юбориш ☎️",
    error_phone: "❌ Нотўғри телефон рақами.",
    
    ask_prepay: "50% олдиндан тўлов қиласизми?",
    btn_yes: "✅ Ҳа",
    btn_no: "❌ Йўқ",
    
    card_info: "💳 Карта рақами:\n9860 1234 5678 9010\n\n📷 Тўлов чекини юборинг.",
    booking_success: "✅ Буюртмангиз муваффақиятли қабул қилинди.",
    
    parcel_intro: "📦 Почта юбориш\n\nҚаердан қаерга?",
    parcel_desc_prompt: "✍️ Почта ва нима юubormoqchi ekanligingizni ёзиб қолдиринг:",
    parcel_phone_prompt: "📞 Юборувчи/қабул қилувчи телефон рақамини киритинг:",
    parcel_success: "✅ Почта буюртмаси қабул қилинди!",

    benefits_text: "-------------------------------\n\n- йўловчи - Келишилади\n\n- почта - Келишилади\n\n-------------------------------",
    
    back_to_menu: "Бош меню"
  }
};

function getUserLang(userId) {
  return new Promise((resolve) => {
    db.get(`SELECT language FROM users WHERE id = ?`, [userId], (err, row) => {
      if (row && langData[row.language]) {
        resolve(row.language);
      } else {
        resolve('uz');
      }
    });
  });
}

function getMainMenu(lang, userId) {
  const t = langData[lang] || langData['uz'];
  const keyboard = [
    [t.btn_book, t.btn_parcel],
    [t.btn_benefits]
  ];
  
  if (userId === ADMIN_ID) {
    keyboard.push(["📢 Реклама юбориш", "📊 Статистика"]);
  }
  
  return Markup.keyboard(keyboard).resize();
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || "Фойдаланувчи";
  db.run(`INSERT OR IGNORE INTO users (id, language, joined_date) VALUES (?, 'uz', ?)`, [userId, new Date().toISOString()]);
  userState[userId] = { step: 'idle' };
  
  await ctx.reply(`Ассалому алайкум ${userName}  ! Хуш келибсиз!`, {
    parse_mode: 'HTML',
    ...getMainMenu('uz', userId)
  });
});

bot.on('text', async (ctx, next) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const lang = await getUserLang(userId);
  const t = langData[lang] || langData['uz'];

  if (!userState[userId]) userState[userId] = { step: 'idle' };
  const state = userState[userId];

  // --- АДМИН ПАНЕЛЬ ҚИСМИ ---
  if (userId === ADMIN_ID && text === "📢 Реклама юбориш") {
    userState[userId] = { step: 'admin_broadcast' };
    return ctx.reply("📢 Барча фойдаланувчиларга юubormoqchi бўлган реклама матнини ёки расмини юборинг:", Markup.keyboard([[t.back_to_menu]]).resize());
  }

  if (userId === ADMIN_ID && text === "📊 Статистика") {
    db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
      const totalUsers = row ? row.count : 0;
      return ctx.reply(`📊 Бот статистикаси:\n\n👥 Жами фойдаланувчилар: ${totalUsers} та`, getMainMenu(lang, userId));
    });
    return;
  }

  if (userId === ADMIN_ID && state.step === 'admin_broadcast') {
    userState[userId] = { step: 'idle' };
    
    db.all(`SELECT id FROM users`, async (err, rows) => {
      if (err) {
        return ctx.reply("❌ Хатолик юз берди.", getMainMenu(lang, userId));
      }
      
      let successCount = 0;
      let failCount = 0;

      await ctx.reply(`⏳ Реклама юбориш бошланди... Жами фойдаланувчилар: ${rows.length} та`);

      for (const row of rows) {
        try {
          await ctx.telegram.copyMessage(row.id, ctx.chat.id, ctx.message.message_id);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 35));
        } catch (e) {
          failCount++;
        }
      }

      await ctx.reply(`✅ Реклама тарқатиб бўлинди!\n\n📤 Муваффақиятли: ${successCount}\n❌ Хатолик (блоклаганлар): ${failCount}`, getMainMenu(lang, userId));
    });
    return;
  }
  // --- АДМИН ПАНЕЛЬ ТУГАДИ ---

  if (text === 'Бош меню' || text === '⬅️ Бош меню') {
    userState[userId] = { step: 'idle' };
    return ctx.reply("Бош меню", getMainMenu(lang, userId));
  }

  if (text === t.btn_benefits) {
    userState[userId] = { step: 'idle' };
    return ctx.reply(t.benefits_text, { parse_mode: 'HTML', ...getMainMenu(lang, userId) });
  }

  if (text === t.btn_book) {
    userState[userId] = { step: 'book_route' };
    return ctx.reply(t.ask_route, Markup.keyboard([[t.route_1], [t.route_2], [t.back_to_menu]]).resize());
  }

  if (text === t.btn_parcel) {
    userState[userId] = { step: 'parcel_route' };
    return ctx.reply(t.parcel_intro, Markup.keyboard([[t.route_1], [t.route_2], [t.back_to_menu]]).resize(), { parse_mode: 'HTML' });
  }

  // --- PASSENGER STATE MACHINE ---
  if (state.step === 'book_route') {
    if (text !== t.route_1 && text !== t.route_2) return ctx.reply("Илтимос, тугмани танланг:");
    state.route = text;
    state.step = 'book_datetime';
    return ctx.reply(t.ask_datetime, { parse_mode: 'HTML', ...Markup.keyboard([[t.back_to_menu]]).resize() });
  }

  if (state.step === 'book_datetime') {
    if (!text.includes('.') || text.length < 10) {
      return ctx.reply(t.error_datetime, { parse_mode: 'HTML' });
    }
    state.datetime = text;
    state.step = 'book_passengers';
    return ctx.reply(t.ask_passengers, Markup.keyboard([
      ['1 👤', '2 👤👤'],
      ['3 👤👤👤', t.btn_empty_car],
      [t.back_to_menu]
    ]).resize());
  }

  if (state.step === 'book_passengers') {
    const validOptions = ['1 👤', '2 👤👤', '3 👤👤👤', t.btn_empty_car];
    if (!validOptions.includes(text)) return ctx.reply(t.error_passengers);
    
    state.passengers = text;
    state.totalPrice = "Келишилади";
    state.step = 'book_fullname';
    return ctx.reply(t.ask_fullname, Markup.keyboard([[t.back_to_menu]]).resize());
  }

  if (state.step === 'book_fullname') {
    state.fullname = text;
    state.step = 'book_phone';
    return ctx.reply(t.ask_phone, Markup.keyboard([[Markup.button.contactRequest(t.btn_send_contact)], [t.back_to_menu]]).resize());
  }

  if (state.step === 'book_phone') {
    state.phone = text;
    state.step = 'book_prepay';
    return ctx.reply(t.ask_prepay, Markup.keyboard([[t.btn_yes, t.btn_no], [t.back_to_menu]]).resize());
  }

  if (state.step === 'book_prepay') {
    if (text === t.btn_yes) {
      state.prepay = 'Ҳа';
      state.step = 'book_receipt';
      return ctx.reply(t.card_info, { parse_mode: 'HTML', ...Markup.keyboard([[t.back_to_menu]]).resize() });
    } else {
      state.prepay = "Йўқ";
      await finalizeBooking(ctx, userId, state, lang);
    }
    return;
  }

  // --- PARCEL STATE MACHINE ---
  if (state.step === 'parcel_route') {
    if (text !== t.route_1 && text !== t.route_2) return ctx.reply("Илтимос, тугмани танланг:");
    state.parcelRoute = text;
    state.step = 'parcel_desc_input';
    return ctx.reply(t.parcel_desc_prompt, Markup.keyboard([[t.back_to_menu]]).resize());
  }

  if (state.step === 'parcel_desc_input') {
    state.parcelDesc = text;
    state.step = 'parcel_phone_input';
    return ctx.reply(t.parcel_phone_prompt, Markup.keyboard([[Markup.button.contactRequest(t.btn_send_contact)], [t.back_to_menu]]).resize());
  }

  if (state.step === 'parcel_phone_input') {
    state.parcelPhone = text;
    
    db.run(`INSERT INTO parcels (user_id, route, description, phone, created_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, state.parcelRoute, state.parcelDesc, state.parcelPhone, new Date().toISOString()]);

    userState[userId] = { step: 'idle' };
    await ctx.reply(t.parcel_success, getMainMenu(lang, userId));

    try {
      await bot.telegram.sendMessage(ADMIN_ID, `📦 Янги почта!\n\n📍 Йўналиш: ${state.parcelRoute}\n📝 Тавсиф: ${state.parcelDesc}\n📞 Тел: ${state.parcelPhone}\n👤 User ID: ${userId}`, { parse_mode: 'HTML' });
    } catch (e) { console.error(e); }
    return;
  }

  return next();
});

bot.on('contact', async (ctx) => {
  const userId = ctx.from.id;
  const lang = await getUserLang(userId);
  const t = langData[lang] || langData['uz'];
  const state = userState[userId];

  if (state && state.step === 'book_phone') {
    state.phone = ctx.message.contact.phone_number;
    state.step = 'book_prepay';
    return ctx.reply(t.ask_prepay, Markup.keyboard([[t.btn_yes, t.btn_no], [t.back_to_menu]]).resize());
  }

  if (state && state.step === 'parcel_phone_input') {
    state.parcelPhone = ctx.message.contact.phone_number;
    
    db.run(`INSERT INTO parcels (user_id, route, description, phone, created_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, state.parcelRoute, state.parcelDesc, state.parcelPhone, new Date().toISOString()]);

    userState[userId] = { step: 'idle' };
    await ctx.reply(t.parcel_success, getMainMenu(lang, userId));

    try {
      await bot.telegram.sendMessage(ADMIN_ID, `📦 Янги почта!\n\n📍 Йўналиш: ${state.parcelRoute}\n📝 Тавсиф: ${state.parcelDesc}\n📞 Тел: ${state.parcelPhone}\n👤 User ID: ${userId}`, { parse_mode: 'HTML' });
    } catch (e) { console.error(e); }
  }
});

// --- RASM (CHEK VA REKLAMA) QABUL QILISH QISMI ---
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const lang = await getUserLang(userId);
  const t = langData[lang] || langData['uz'];
  const state = userState[userId];

  if (state && state.step === 'book_receipt') {
    state.prepay = 'Ҳа (Чеки юборилди)';
    
    db.run(`INSERT INTO bookings (user_id, route, datetime, passengers, total_price, fullname, phone, prepay, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, state.route, state.datetime, state.passengers, state.totalPrice, state.fullname, state.phone, state.prepay, new Date().toISOString()],
      async () => {
        const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        userState[userId] = { step: 'idle' };
        
        await ctx.reply(t.booking_success, getMainMenu(lang, userId));
        
        try {
          await bot.telegram.sendPhoto(ADMIN_ID, photoId, {
            caption: `🚖 <b>Янги буюртма (Тўлов чеки bilan)!</b>\n\n📍 Йўналиш: ${state.route}\n📅 Вақт: ${state.datetime}\n👥 Одам сони: ${state.passengers}\n👤 Исм: ${state.fullname}\n📞 Тел: ${state.phone}\n💳 Олindan тўлов: Ҳа`,
            parse_mode: 'HTML'
          });
        } catch (e) {
          console.error(e);
        }
      }
    );
    return;
  }

  if (userId === ADMIN_ID && state && state.step === 'admin_broadcast') {
    userState[userId] = { step: 'idle' };
    
    db.all(`SELECT id FROM users`, async (err, rows) => {
      if (err) return ctx.reply("❌ Хатолик юз берди.", getMainMenu(lang, userId));
      
      let successCount = 0;
      let failCount = 0;

      await ctx.reply(`⏳ Реклама (расм) юбориш бошланди... Жами фойдаланувчилар: ${rows.length} та`);

      for (const row of rows) {
        try {
          await ctx.telegram.copyMessage(row.id, ctx.chat.id, ctx.message.message_id);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 35));
        } catch (e) {
          failCount++;
        }
      }

      await ctx.reply(`✅ Реклама тарқатиб бўлинди!\n\n📤 Муваффақиятли: ${successCount}\n❌ Хатолик: ${failCount}`, getMainMenu(lang, userId));
    });
    return;
  }
});

async function finalizeBooking(ctx, userId, state, lang) {
  const t = langData[lang] || langData['uz'];
  db.run(`INSERT INTO bookings (user_id, route, datetime, passengers, total_price, fullname, phone, prepay, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, state.route, state.datetime, state.passengers, state.totalPrice, state.fullname, state.phone, state.prepay, new Date().toISOString()],
    async () => {
      userState[userId] = { step: 'idle' };
      await ctx.reply(t.booking_success, getMainMenu(lang, userId));
      try {
        await bot.telegram.sendMessage(ADMIN_ID, `🚖 Янги буюртма!\n\n📍 ${state.route}\n📅 ${state.datetime}\n👥 ${state.passengers}\n👤 ${state.fullname}\n📞 ${state.phone}`, { parse_mode: 'HTML' });
      } catch (e) {}
    }
  );
}
bot.launch().then(() => {
    console.log('Bot muvaffaqiyatli ishga tushdi!');
});

bot.launch().then(() => console.log('Бот ишга тушди!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));