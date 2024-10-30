const { getMessage } = require("./language");
const { updateUserState } = require("./userState");

async function checkUserPostState(bot, chatId, users, userId) {
  const userState = users[userId];

  const hasOpenLink = userState.hasLink && userState.linkStatus === "open";
  const hasAudio = userState.hasAudio !== null;
  const hasImage = userState.hasImage !== null;
  const hasText = userState.hasText !== null;
  const hasLink = userState.hasLink !== null;

  const missingElements = [];
  const additionalElements = [];

  if (!hasAudio) {
    missingElements.push(getMessage("mix", userState.language));
  }
  if (!hasImage) {
    missingElements.push(getMessage("cover", userState.language));
  }
  if (!hasLink) {
    additionalElements.push(getMessage("link", userState.language));
  }
  if (!hasText) {
    additionalElements.push(getMessage("description", userState.language));
  }

  if (hasOpenLink) {
    const imageIndex = missingElements.indexOf(
      getMessage("cover", userState.language)
    );
    if (imageIndex !== -1) {
      missingElements.splice(imageIndex, 1);
      additionalElements.push(getMessage("cover", userState.language));
    }
  }

  let missingMessage = "";
  if (missingElements.length > 0) {
    missingMessage = `${getMessage(
      "needToSend",
      userState.language
    )}${missingElements.join(", ")}`;
  }

  if (additionalElements.length > 0) {
    missingMessage += `\n${getMessage(
      "canAdd",
      userState.language
    )}${additionalElements.join(", ")}`;
  }

  const hasMinimalSet = hasAudio && (hasImage || hasOpenLink);
  const hasMaxSet = hasAudio && hasImage && hasLink && hasText;

  let messageIds = [];

  if (hasMaxSet) {
    const publishButton = {
      text: getMessage("publishButton", userState.language),
      callback_data: "publish",
    };
    const replyMarkup = {
      inline_keyboard: [[publishButton]],
    };
    const sentMessage = await bot.sendMessage(
      chatId,
      getMessage("allElementsSent", userState.language),
      {
        reply_markup: replyMarkup,
      }
    );
    messageIds.push(sentMessage.message_id);
  } else if (hasMinimalSet) {
    const canPublishMessage = `${getMessage(
      "canPublishWithCurrentElements",
      userState.language
    )}\n${getMessage("canAdd", userState.language)}${additionalElements.join(
      ", "
    )}\n${getMessage("canPublishWithCurrentElements2", userState.language)}`;
    const publishButton = {
      text: getMessage("publishButton", userState.language),
      callback_data: "publish",
    };
    const replyMarkup = {
      inline_keyboard: [[publishButton]],
    };
    const sentMessage = await bot.sendMessage(chatId, canPublishMessage, {
      reply_markup: replyMarkup,
    });
    messageIds.push(sentMessage.message_id);
  } else {
    const sentMessage = await bot.sendMessage(chatId, missingMessage);
    messageIds.push(sentMessage.message_id);
  }

  updateUserState(users, userId, { messageIds });
}

module.exports = { checkUserPostState };
