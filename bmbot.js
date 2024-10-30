require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { getMessage, selectLanguage, messages } = require("./language");
const handleMessage = require("./handleMessage");
const {
  loadUserData,
  saveUserData,
  initializeUser,
  updateUserState,
  clearMessageIds,
} = require("./userState");
const { checkUserPostState } = require("./checkUserPostState");
const { publishPost, CHANNEL_ID, ADMIN_ID } = require("./publishPost");

const path = require("path");
const fs = require("fs");
const forbiddenLinksFilePath = path.join(__dirname, "forbiddenLinks.json");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = loadUserData();

// Команда START
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  initializeUser(users, userId);

  if (!users[userId].language) {
    selectLanguage(bot, chatId);
  } else {
    updateUserState(users, userId, {
      hasLink: null,
      hasAudio: null,
      hasText: null,
      hasImage: null,
      linkStatus: null,
      isGroup: false,
      lastMessageTime: 0,
      timerStarted: false,
      messagesSent: false,
      messageIds: [],
    });

    bot.sendMessage(chatId, getMessage("sendLink", users[userId].language));
  }
});

// Команда /russian
bot.onText(/\/russian/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  updateUserState(users, userId, { language: "ru" });
  bot.sendMessage(chatId, "Язык изменен на русский.");
});

// Команда /english
bot.onText(/\/english/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  updateUserState(users, userId, { language: "en" });
  bot.sendMessage(chatId, "Language changed to English.");
});

// Команда /unblockuser
bot.onText(/\/unblockuser (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const targetUser = match[1];

  if (userId.toString() !== ADMIN_ID) {
    bot.sendMessage(chatId, "You are not authorized to use this command.");
    return;
  }

  let targetUserId;

  if (targetUser.startsWith("@")) {
    try {
      const userInfo = await bot.getChat(targetUser);
      targetUserId = userInfo.id;
    } catch (error) {
      bot.sendMessage(chatId, `User ${targetUser} not found.`);
      return;
    }
  } else {
    targetUserId = parseInt(targetUser, 10);
  }

  if (!users[targetUserId]) {
    bot.sendMessage(chatId, `User ${targetUser} not found.`);
    return;
  }

  updateUserState(users, targetUserId, { isBlocked: false });
  bot.sendMessage(chatId, `User ${targetUser} has been unblocked.`);

  const targetUserChat = await bot.getChat(targetUserId);
  if (targetUserChat && targetUserChat.id) {
    bot.sendMessage(
      targetUserChat.id,
      getMessage("unblocked", users[targetUserId].language)
    );
  }
});

// Команда /stoplinks
bot.onText(/\/stoplinks (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const forbiddenPrefixes = match[1].split(" ");

  if (userId.toString() !== ADMIN_ID) {
    bot.sendMessage(
      chatId,
      getMessage("notAuthorized", users[userId].language)
    );
    return;
  }

  let forbiddenPrefixesList = [];
  if (fs.existsSync(forbiddenLinksFilePath)) {
    forbiddenPrefixesList = JSON.parse(fs.readFileSync(forbiddenLinksFilePath));
  }

  forbiddenPrefixesList = [
    ...new Set([...forbiddenPrefixesList, ...forbiddenPrefixes]),
  ];

  fs.writeFileSync(
    forbiddenLinksFilePath,
    JSON.stringify(forbiddenPrefixesList, null, 2)
  );

  bot.sendMessage(
    chatId,
    getMessage("forbiddenPrefixesUpdated", users[userId].language)
  );
});

// Обработка callback_query
bot.on("callback_query", async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  if (data === "publish") {
    await publishPost(bot, chatId, users, userId);
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  } else if (data.startsWith("approve_")) {
    const targetUserId = data.split("_")[1];
    updateUserState(users, targetUserId, { isApproved: true });
    await bot.answerCallbackQuery(query.id, { text: "User approved" });
    bot.sendMessage(
      chatId,
      `User ${targetUserId} has been approved for posting.`
    );

    const targetUserChat = await bot.getChat(targetUserId);
    if (targetUserChat && targetUserChat.id) {
      bot.sendMessage(
        targetUserChat.id,
        getMessage("approvalApproved", users[targetUserId].language)
      );
    }

    if (users[targetUserId].isApproved) {
      await publishPost(bot, chatId, users, targetUserId);
      try {
        await bot.deleteMessage(chatId, messageId);
      } catch (error) {}
    }
  } else if (data.startsWith("reject_")) {
    const targetUserId = data.split("_")[1];
    updateUserState(users, targetUserId, { isApproved: false });
    await bot.answerCallbackQuery(query.id, { text: "User rejected" });
    bot.sendMessage(
      chatId,
      `User ${targetUserId}'s request has been rejected.`
    );

    const targetUserChat = await bot.getChat(targetUserId);
    if (targetUserChat && targetUserChat.id) {
      bot.sendMessage(
        targetUserChat.id,
        getMessage("approvalRejected", users[targetUserId].language)
      );
    }

    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  } else if (data.startsWith("block_")) {
    const targetUserId = data.split("_")[1];
    updateUserState(users, targetUserId, { isBlocked: true });
    await bot.answerCallbackQuery(query.id, { text: "User blocked" });
    bot.sendMessage(chatId, `User ${targetUserId} has been blocked.`);

    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  } else if (data === "/english") {
    updateUserState(users, userId, { language: "en" });
    await bot.sendMessage(chatId, getMessage("welcome", "en"));
    await bot.sendMessage(chatId, getMessage("sendLink", "en"));
  } else if (data === "/russian") {
    updateUserState(users, userId, { language: "ru" });
    await bot.sendMessage(chatId, getMessage("welcome", "ru"));
    await bot.sendMessage(chatId, getMessage("sendLink", "ru"));
  }
});

// Обработка сообщений
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const currentTime = msg.date * 1000;

  initializeUser(users, userId);

  const timeDifference = currentTime - users[userId].lastMessageTime;
  const isGroup = timeDifference < 500;

  if (isGroup) {
    updateUserState(users, userId, { isGroup: true });
  } else {
    updateUserState(users, userId, { isGroup: false });
  }

  updateUserState(users, userId, {
    lastMessageTime: currentTime,
    messagesSent: false,
  });

  await deleteUserMessages(bot, chatId, users, userId);

  if (msg.text === "/start") {
    return;
  }

  if (users[userId].isBlocked) {
    bot.sendMessage(chatId, messages.blockedMessage[users[userId].language]);
    return;
  }

  if (msg.text && msg.text.startsWith("/")) {
    return;
  }

  handleMessage(msg, users, userId, updateUserStateWithCheck, bot);

  if (!users[userId].timerStarted) {
    updateUserState(users, userId, { timerStarted: true });
    setTimeout(async () => {
      const messagesSent = await sendUserStateMessages(
        bot,
        chatId,
        users,
        userId
      );
      updateUserState(users, userId, { timerStarted: false, messagesSent });

      if (messagesSent) {
        await checkUserPostState(bot, chatId, users, userId);
      }
    }, 1000);
  }
});

// Отправка сообщений о состоянии пользователя
async function sendUserStateMessages(bot, chatId, users, userId) {
  const userState = users[userId];

  let messageText = "";
  let photo = null;
  let audio = null;
  let messagesSent = false;

  if (userState.hasLink) {
    messageText += `•••\n Check [out](${userState.hasLink})\n———\n\n`;
    messagesSent = true;
  }

  if (userState.hasText) {
    messageText += `${userState.hasText}\n`;
    messagesSent = true;
  }

  if (userState.hasImage) {
    photo = userState.hasImage;
    messagesSent = true;
  }

  if (userState.hasAudio) {
    audio = userState.hasAudio;
    messagesSent = true;
  }

  let messageIds = [];

  if (photo) {
    const sentMessage = await bot.sendPhoto(chatId, photo, {
      caption: messageText,
      parse_mode: "Markdown",
    });
    messageIds.push(sentMessage.message_id);
  } else if (messageText) {
    const sentMessage = await bot.sendMessage(chatId, messageText, {
      parse_mode: "Markdown",
    });
    messageIds.push(sentMessage.message_id);
  }

  if (audio) {
    const audioCaption = "@Breakinmix                                   • • •";
    const subscribeButton = {
      text: "Subscribe",
      url: "https://t.me/+TTFRNjNLTYsuCYkV",
    };
    const keyboard = {
      inline_keyboard: [[subscribeButton]],
    };

    const sentMessage = await bot.sendAudio(chatId, audio, {
      caption: audioCaption,
      reply_markup: keyboard,
    });
    messageIds.push(sentMessage.message_id);
  }

  updateUserState(users, userId, { messageIds });

  return messagesSent;
}

// Удаление сообщений пользователя
async function deleteUserMessages(bot, chatId, users, userId) {
  const userState = users[userId];
  const messageIds = userState.messageIds || [];

  for (const messageId of messageIds) {
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  }

  clearMessageIds(users, userId);
  saveUserData(users);
}

// Обработка ошибок опроса
bot.on("polling_error", (error) => {
  if (error.code === "ETELEGRAM") {
    console.error("Telegram API error:", error.message);
  } else {
    console.error("Polling error:", error.code);
  }
});

// Обновление состояния пользователя с проверкой
function updateUserStateWithCheck(users, userId, newState) {
  const userState = users[userId];

  if (userState.isGroup === newState.isGroup) {
    for (const key in newState) {
      if (newState[key] && !userState[key]) {
        userState[key] = newState[key];
      }
    }
  } else {
    for (const key in newState) {
      userState[key] = newState[key];
    }
  }

  saveUserData(users);
}
