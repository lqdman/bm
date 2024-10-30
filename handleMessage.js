const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getMessage } = require("./language");

const forbiddenLinksFilePath = path.join(__dirname, "forbiddenLinks.json");

module.exports = async function handleMessage(
  msg,
  users,
  userId,
  updateUserState,
  bot
) {
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption;

  let forbiddenPrefixesList = [];
  if (fs.existsSync(forbiddenLinksFilePath)) {
    forbiddenPrefixesList = JSON.parse(fs.readFileSync(forbiddenLinksFilePath));
  }

  if (msg.audio) {
    const audioDescription = msg.audio.title || msg.audio.performer || "";
    const linksFromAudioDescription = extractLinks(audioDescription);
    const linksFromMessageText = extractLinks(
      text,
      msg.entities || msg.caption_entities
    );

    const links = [...linksFromAudioDescription, ...linksFromMessageText];

    if (links.length > 0) {
      const link = selectPreferredLink(links);
      if (
        isForbiddenLink(link, forbiddenPrefixesList) ||
        isTelegramBotLink(link)
      ) {
        bot.sendMessage(
          chatId,
          getMessage("forbiddenLink", users[userId].language)
        );
        return;
      }

      let linkStatus = "open";

      if (/vk\.com\/audio\d+_\d+/.test(link)) {
        linkStatus = "closed";
      } else if (/soundcloud\.com/.test(link)) {
        linkStatus = "open";
      } else if (/vk\.com/.test(link)) {
        const vkLinkMatch = link.match(/vk\.com\/([\w\d]+)\?w=wall(-?\d+_\d+)/);

        if (vkLinkMatch) {
          const vkEntityId = vkLinkMatch[1];
          const status = await checkVkEntityStatus(vkEntityId);

          if (status === "open") {
            linkStatus = "open";
          } else if (status === "closed") {
            linkStatus = "closed";
          } else if (status === "deleted") {
            linkStatus = "deleted";
          } else {
            linkStatus = "error";
          }
        }
      }

      updateUserState(users, userId, {
        hasLink: link,
        hasAudio: msg.audio.file_id,
        linkStatus,
      });
    } else {
      updateUserState(users, userId, { hasAudio: msg.audio.file_id });
    }
  } else if (msg.photo) {
    const photo = msg.photo[msg.photo.length - 1];
    updateUserState(users, userId, { hasImage: photo.file_id });
  } else if (text) {
    const entities = msg.entities || msg.caption_entities;
    const links = extractLinks(text, entities);

    if (links.length > 0) {
      const link = selectPreferredLink(links);
      if (
        isForbiddenLink(link, forbiddenPrefixesList) ||
        isTelegramBotLink(link)
      ) {
        bot.sendMessage(
          chatId,
          getMessage("forbiddenLink", users[userId].language)
        );
        return;
      }

      let linkStatus = "open";

      if (/vk\.com\/audio\d+_\d+/.test(link)) {
        linkStatus = "closed";
      } else if (/soundcloud\.com/.test(link)) {
        linkStatus = "open";
      } else if (/vk\.com/.test(link)) {
        const vkLinkMatch = link.match(/vk\.com\/([\w\d]+)\?w=wall(-?\d+_\d+)/);

        if (vkLinkMatch) {
          const vkEntityId = vkLinkMatch[1];
          const status = await checkVkEntityStatus(vkEntityId);

          if (status === "open") {
            linkStatus = "open";
          } else if (status === "closed") {
            linkStatus = "closed";
          } else if (status === "deleted") {
            linkStatus = "deleted";
          } else {
            linkStatus = "error";
          }
        }
      }

      updateUserState(users, userId, { hasLink: link, linkStatus });
    } else {
      updateUserState(users, userId, { hasText: text });
    }
  }
};

function isForbiddenLink(link, forbiddenPrefixes) {
  return forbiddenPrefixes.some((prefix) => link.startsWith(prefix));
}

function isTelegramBotLink(link) {
  return /https:\/\/t\.me\/[a-zA-Z0-9_]+bot(\?[\w=&]+)?$/.test(link);
}

function extractLinks(text, entities) {
  const links = [];

  if (entities) {
    entities.forEach((entity) => {
      if (entity.type === "url") {
        const url = text.substring(
          entity.offset,
          entity.offset + entity.length
        );
        links.push(url);
      } else if (entity.type === "text_link") {
        links.push(entity.url);
      }
    });
  }

  const urlRegex = /https?:\/\/[^\s]+/g;
  const foundLinks = text ? text.match(urlRegex) : [];
  if (foundLinks) {
    links.push(...foundLinks);
  }

  return links;
}

function selectPreferredLink(links) {
  const soundcloudLink = links.find((link) => /soundcloud\.com/.test(link));
  return soundcloudLink || links[0];
}

async function checkVkEntityStatus(entityId) {
  const accessToken = process.env.VK_ACCESS_TOKEN;
  const groupId = entityId.replace(/^(club|public|group|event)/, "");
  let apiUrl = `https://api.vk.com/method/groups.getById?group_ids=${groupId}&fields=is_closed&v=5.131&access_token=${accessToken}`;

  try {
    let response = await axios.get(apiUrl);

    if (response.data.response && response.data.response.length > 0) {
      const entity = response.data.response[0];

      if (entity.deactivated) {
        return "deleted";
      } else if (entity.is_closed === 1) {
        return "closed";
      } else {
        return "open";
      }
    }

    apiUrl = `https://api.vk.com/method/users.get?user_ids=${entityId}&v=5.131&access_token=${accessToken}`;
    response = await axios.get(apiUrl);

    if (response.data.response && response.data.response.length > 0) {
      const user = response.data.response[0];

      if (user.deactivated) {
        return "deleted";
      } else if (user.is_closed) {
        return "closed";
      } else {
        return "open";
      }
    } else {
      return "error";
    }
  } catch (error) {
    return "error";
  }
}
