const messages = {
  welcome: {
    en: "Language selected. Welcome!",
    ru: "Язык выбран. Добро пожаловать!",
  },
  sendCover: {
    en: "Great, you need a cover for the mix",
    ru: "Отлично, для микса нужна обложка",
  },
  sendLink: {
    en: "Send me a link to the mix or the mix page and the mix itself.",
    ru: "Пришли мне ссылку на микс или на страницу микса и сам микс.",
  },
  missingElements: {
    en: "Missing elements: ",
    ru: "Можно добавить ",
  },
  needToSend: {
    en: "Need to send ",
    ru: "Нужно прислать ",
  },
  canAdd: {
    en: "Can add ",
    ru: "Можно добавить ",
  },
  canPublish: {
    en: "You can publish the post with the current elements.",
    ru: "Пост готов к публикации.",
  },
  publishButton: {
    en: "Publish",
    ru: "Опубликовать",
  },
  editButton: {
    en: "Edit",
    ru: "Редактировать",
  },
  postPublished: {
    en: "Post successfully published!",
    ru: "Пост успешно опубликован!\nДля нового раунда кликай /start",
  },
  notEnoughElements: {
    en: "Not enough elements to publish.",
    ru: "Недостаточно элементов для публикации.",
  },
  canPublishWithCurrentElements: {
    en: "You can publish the post with the current elements.",
    ru: "Пост готов к публикации, так же",
  },
  canPublishWithCurrentElements2: {
    en: "send me before you click publish",
    ru: "прислав мне прежде чем нажмешь опубликовать",
  },
  allElementsSent: {
    en: "You've sent all the post elements, just publish it.",
    ru: "Ты прислал все элементы поста, осталось опубликовать.",
  },
  approvalRequested: {
    en: "Your request for approval has been sent to the admin.",
    ru: "Ваш запрос на одобрение был отправлен администратору.",
  },
  approvalApproved: {
    en: "Your request has been approved. The post is now published.",
    ru: "Ваш запрос одобрен. Пост опубликован.",
  },
  approvalRejected: {
    en: "Your request has been rejected.",
    ru: "Ваш запрос отклонен.",
  },
  adminApprovalRequest: {
    en: "@%username% wants to publish a mix. Approve or reject?",
    ru: "@%username% хочет опубликовать микс. Одобрить или отклонить?",
  },
  blockedMessage: {
    en: "You have been blocked. If this is a mistake, please contact @lqdamc.",
    ru: "Вы были заблокированы. Если это ошибка, свяжитесь с @lqdamc.",
  },
  unblockRequest: {
    en: "Unblock request from @%username% (ID: %userId%).",
    ru: "Запрос на разблокировку от @%username% (ID: %userId%).",
  },
  unblocked: {
    en: "You have been unblocked. You can now use the bot again.",
    ru: "Вы были разблокированы. Теперь вы можете снова использовать бота.",
  },
  mix: {
    en: "mix",
    ru: "микс",
  },
  cover: {
    en: "cover",
    ru: "обложку",
  },
  link: {
    en: "link",
    ru: "ссылку",
  },
  description: {
    en: "description",
    ru: "описание",
  },
  notAuthorized: {
    en: "You are not authorized to use this command.",
    ru: "У вас нет прав для использования этой команды.",
  },
  forbiddenPrefixesUpdated: {
    en: "Forbidden prefixes have been updated.",
    ru: "Запрещенные префиксы были обновлены.",
  },
  forbiddenLink: {
    en: "This type of link is not suitable for the post.",
    ru: "Этот тип ссылки не подходит для поста.",
  },
};

// Функция для получения сообщения на выбранном языке
function getMessage(key, language) {
  return messages[key][language] || messages[key].en;
}

// Функция для выбора языка
function selectLanguage(bot, chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "English", callback_data: "/english" }],
      [{ text: "Русский", callback_data: "/russian" }],
    ],
  };
  bot.sendMessage(chatId, "Language / Язык", { reply_markup: keyboard });
}

module.exports = {
  getMessage,
  selectLanguage,
  messages,
};
