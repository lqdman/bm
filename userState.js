const fs = require("fs");
const path = require("path");

// Функция для загрузки данных пользователей из файла
function loadUserData() {
  const filePath = path.join(__dirname, "data", "users.json");
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  }
  return {};
}

// Функция для сохранения данных пользователей в файл
function saveUserData(users) {
  const dirPath = path.join(__dirname, "data");
  const filePath = path.join(dirPath, "users.json");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), "utf8");
}

// Функция для инициализации пользователя
function initializeUser(users, userId) {
  if (!users[userId]) {
    users[userId] = {
      language: null,
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
    };
    saveUserData(users);
  }
}

// Функция для обновления состояния пользователя
function updateUserState(users, userId, state) {
  const userState = users[userId];

  if (state.messageIds) {
    state.messageIds = [...(userState.messageIds || []), ...state.messageIds];
  }

  users[userId] = { ...userState, ...state };
  saveUserData(users);
}

// Функция для очистки массива ID сообщений после удаления
function clearMessageIds(users, userId) {
  if (users[userId]) {
    users[userId].messageIds = [];
  }
}

module.exports = {
  loadUserData,
  saveUserData,
  initializeUser,
  updateUserState,
  clearMessageIds,
};
