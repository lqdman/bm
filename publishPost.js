require("dotenv").config();

const { getMessage } = require("./language");
const { updateUserState } = require("./userState");

const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID;

if (!CHANNEL_ID) {
  throw new Error("CHANNEL_ID is not defined");
}

if (!ADMIN_ID) {
  throw new Error("ADMIN_ID is not defined");
}

module.exports = { publishPost, CHANNEL_ID, ADMIN_ID };

async function publishPost(bot, chatId, users, userId) {
  const userState = users[userId];
  const isAdmin = userId.toString() === ADMIN_ID;
  const isApproved = userState.isApproved;

  if (isAdmin || isApproved) {
    const postMessage = await publishToChannel(bot, userState);
    if (chatId) {
      bot.sendMessage(chatId, getMessage("postPublished", userState.language));
    }
    await notifyAdminAboutPost(bot, userId, postMessage);
    resetUserState(users, userId, bot, chatId);
  } else {
    await requestApproval(bot, userId);
    if (chatId) {
      bot.sendMessage(
        chatId,
        getMessage("approvalRequested", userState.language)
      );
    }
  }
}

async function publishToChannel(bot, userState) {
  const { hasLink, hasAudio, hasImage, hasText } = userState;

  let messageText = "";
  let photo = null;
  let audio = null;

  if (hasLink) {
    messageText += `•••\n Check [out](${hasLink})\n———\n\n`;
  }

  if (hasText) {
    messageText += `${hasText}\n`;
  }

  if (hasImage) {
    photo = hasImage;
  }

  if (hasAudio) {
    audio = hasAudio;
  }

  let postMessage;

  if (photo) {
    postMessage = await bot.sendPhoto(CHANNEL_ID, photo, {
      caption: messageText,
      parse_mode: "Markdown",
    });
  } else if (messageText) {
    postMessage = await bot.sendMessage(CHANNEL_ID, messageText, {
      parse_mode: "Markdown",
    });
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

    postMessage = await bot.sendAudio(CHANNEL_ID, audio, {
      caption: audioCaption,
      reply_markup: keyboard,
    });
  }

  return postMessage;
}

async function requestApproval(bot, userId) {
  const approveButton = {
    text: "Одобрить",
    callback_data: `approve_${userId}`,
  };
  const rejectButton = {
    text: "Отклонить",
    callback_data: `reject_${userId}`,
  };
  const replyMarkup = {
    inline_keyboard: [[approveButton, rejectButton]],
  };

  const userInfo = await bot.getChat(userId);
  let username = userInfo.username || "undefined";
  let displayName = username;

  if (username === "undefined") {
    displayName = `[ID: ${userId}](tg://user?id=${userId})`;
  } else {
    displayName = `@${username}`;
  }

  const message = `Пользователь ${displayName} хочет опубликовать микс. Одобрить или отклонить?`;

  await bot.sendMessage(ADMIN_ID, message, {
    parse_mode: "Markdown",
    reply_markup: replyMarkup,
  });

  const chat = await bot.getChat(userId);
  return chat.id;
}

async function notifyAdminAboutPost(bot, userId, postMessage) {
  const userInfo = await bot.getChat(userId);
  let username = userInfo.username || "undefined";
  let displayName = username;

  if (username === "undefined") {
    displayName = `[ID: ${userId}](tg://user?id=${userId})`;
  } else {
    displayName = `@${username}`;
  }

  const publicChannelId = CHANNEL_ID.replace("-100", "c/");
  const postLink = `https://t.me/${publicChannelId}/${postMessage.message_id}`;

  const message =
    username === "undefined"
      ? `Пользователь ${displayName} опубликовал [пост](${postLink})`
      : `Пользователь ${displayName} опубликовал [пост](${postLink})`;

  const blockButton = {
    text: "Заблокировать",
    callback_data: `block_${userId}`,
  };
  const replyMarkup = {
    inline_keyboard: [[blockButton]],
  };

  await bot.sendMessage(ADMIN_ID, message, {
    parse_mode: "Markdown",
    reply_markup: replyMarkup,
  });
}

function resetUserState(users, userId, bot, chatId) {
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
  }
}
