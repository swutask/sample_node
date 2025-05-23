const { required } = require('../utils');
const {
  UserRepo,
  PrivateChatRepo,
  ChatRepo,
  ChatSettingsRepo
} = require('../repos');

class PrivateChatService {
  static async create ({
    creatorId = required(),
    memberId = required(),
    teamId = required()
  } = {}) {
    const [opponent, existChat] = await Promise.all([
      UserRepo.getByIdAndTeamId({
        id: memberId,
        teamId
      }),
      PrivateChatRepo.getByUserIds({
        creatorId,
        memberId
      })
    ]);

    if (!opponent || creatorId === memberId) {
      throw new Error('Wrong member id');
    }

    if (existChat) {
      throw new Error('Private chat with user is already exists');
    }

    const chat = await ChatRepo.create({
      teamId
    });
    const [chatSettings, privateChat] = await Promise.all([
      ChatSettingsRepo.createMany({
        settings: [
          {
            chatId: chat.id,
            userId: creatorId
          },
          {
            chatId: chat.id,
            userId: memberId
          }
        ]
      }),
      PrivateChatRepo.create({
        chatId: chat.id,
        creatorId,
        memberId
      })
    ]);

    const creatorChatSettings = chatSettings.find(chatSetting => chatSetting.userId === creatorId);

    return {
      privateChat: {
        id: privateChat.id,
        chatId: privateChat.chatId,
        creatorId: privateChat.creatorId,
        memberId: privateChat.memberId
      },
      chatSetting: {
        id: creatorChatSettings.id,
        mutedAt: creatorChatSettings.mutedAt
      },
      opponent
    };
  }

  static async getAll ({
    userId = required()
  } = {}) {
    const rawResults = await PrivateChatRepo.getWithSettingsAndOpponent({
      userId
    });

    const chats = [];

    for (const rawResult of rawResults) {
      const latestMessage = await ChatRepo.getLatestMessageByChatId(rawResult.chatId);

      chats.push({
        privateChat: {
          id: rawResult.privateChatId,
          chatId: rawResult.chatId,
          creatorId: rawResult.creatorId,
          memberId: rawResult.memberId,
          messages: latestMessage,
          unreadMessageCount: rawResult.unreadMessageCount
        },
        chatSetting: {
          id: rawResult.chatSettingsId,
          mutedAt: rawResult.mutedAt
        },
        opponent: {
          id: rawResult.opponentId,
          profile: {
            firstName: rawResult.firstName,
            lastName: rawResult.lastName,
            color: rawResult.color
          },
          avatar: {
            url: rawResult.url
          }
        }
      });
    }

    return chats;
  }
}

module.exports = PrivateChatService;
