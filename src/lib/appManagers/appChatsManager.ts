/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 * 
 * Originally from:
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */

import { MOUNT_CLASS_TO } from "../../config/debug";
import { numberThousandSplitter } from "../../helpers/number";
import { isObject, safeReplaceObject, copy, deepEqual } from "../../helpers/object";
import { ChannelParticipant, Chat, ChatAdminRights, ChatBannedRights, ChatFull, ChatParticipant, ChatParticipants, ChatPhoto, InputChannel, InputChatPhoto, InputFile, InputPeer, SendMessageAction, Update, Updates } from "../../layer";
import { i18n, LangPackKey } from "../langPack";
import apiManagerProxy from "../mtproto/mtprotoworker";
import apiManager from '../mtproto/mtprotoworker';
import { RichTextProcessor } from "../richtextprocessor";
import rootScope from "../rootScope";
import apiUpdatesManager from "./apiUpdatesManager";
import appMessagesManager from "./appMessagesManager";
import appPeersManager from "./appPeersManager";
import appProfileManager from "./appProfileManager";
import appStateManager from "./appStateManager";
import appUsersManager from "./appUsersManager";

export type Channel = Chat.channel;

export type ChatRights = keyof ChatBannedRights['pFlags'] | keyof ChatAdminRights['pFlags'] | 'change_type' | 'change_permissions' | 'delete_chat' | 'view_participants';

export type UserTyping = Partial<{userId: number, action: SendMessageAction, timeout: number}>;

export class AppChatsManager {
  public chats: {[id: number]: Chat.channel | Chat.chat | any} = {};
  //public usernames: any = {};
  //public channelAccess: any = {};
  //public megagroups: {[id: number]: true} = {};

  public megagroupOnlines: {[id: number]: {timestamp: number, onlines: number}} = {};

  public typingsInPeer: {[peerId: number]: UserTyping[]} = {};

  constructor() {
    rootScope.on('apiUpdate', (update) => {
      // console.log('on apiUpdate', update)
      switch(update._) {
        case 'updateChannel': {
          const channelId = update.channel_id;
          //console.log('updateChannel:', update);
          rootScope.broadcast('channel_settings', {channelId});
          break;
        }

        case 'updateChannelParticipant': {
          apiManagerProxy.clearCache('channels.getParticipants', (params) => {
            return (params.channel as InputChannel.inputChannel).channel_id === update.channel_id;
          });
          break;
        }

        case 'updateChatDefaultBannedRights': {
          const chatId = -appPeersManager.getPeerId(update.peer);
          const chat: Chat = this.getChat(chatId);
          if(chat._ !== 'chatEmpty') {
            (chat as Chat.chat).default_banned_rights = update.default_banned_rights;
            rootScope.broadcast('chat_update', chatId);
          }

          break;
        }

        case 'updateUserTyping':
        case 'updateChatUserTyping':
        case 'updateChannelUserTyping': {
          const fromId = (update as Update.updateUserTyping).user_id || appPeersManager.getPeerId((update as Update.updateChatUserTyping).from_id);
          if(rootScope.myId === fromId) {
            break;
          }
          
          const peerId = update._ === 'updateUserTyping' ? 
            fromId : 
            -((update as Update.updateChatUserTyping).chat_id || (update as Update.updateChannelUserTyping).channel_id);
          const typings = this.typingsInPeer[peerId] ?? (this.typingsInPeer[peerId] = []);
          let typing = typings.find(t => t.userId === fromId);

          const cancelAction = () => {
            delete typing.timeout;
            //typings.findAndSplice(t => t === typing);
            const idx = typings.indexOf(typing);
            if(idx !== -1) {
              typings.splice(idx, 1);
            }
 
            rootScope.broadcast('peer_typings', {peerId, typings});

            if(!typings.length) {
              delete this.typingsInPeer[peerId];
            }
          };

          if(typing && typing.timeout !== undefined) {
            clearTimeout(typing.timeout);
          }

          if(update.action._ === 'sendMessageCancelAction') {
            if(!typing) {
              break;
            }

            cancelAction();
            break;
          } else {
            if(!typing) {
              typing = {
                userId: fromId
              };
  
              typings.push(typing);
            }
  
            //console.log('updateChatUserTyping', update, typings);
            
            typing.action = update.action;
            
            if(!appUsersManager.hasUser(fromId)) {
              if(update._ === 'updateChatUserTyping') {
                if(update.chat_id && appChatsManager.hasChat(update.chat_id) && !appChatsManager.isChannel(update.chat_id)) {
                  appProfileManager.getChatFull(update.chat_id);
                }
              }
              
              //return;
            }
            
            appUsersManager.forceUserOnline(fromId);
  
            typing.timeout = window.setTimeout(cancelAction, 6000);
            rootScope.broadcast('peer_typings', {peerId, typings});
          }

          break;
        }
      }
    });

    appStateManager.getState().then((state) => {
      this.chats = state.chats;
    });
  }

  public saveApiChats(apiChats: any[]) {
    apiChats.forEach(chat => this.saveApiChat(chat));
  }

  public saveApiChat(chat: any) {
    // * exclude from state
    // defineNotNumerableProperties(chat, ['rTitle', 'initials']);
    
    //chat.rTitle = chat.title || 'chat_title_deleted';
    chat.rTitle = RichTextProcessor.wrapRichText(chat.title, {noLinks: true, noLinebreaks: true}) || 'chat_title_deleted';

    const oldChat = this.chats[chat.id];

    chat.initials = RichTextProcessor.getAbbreviation(chat.title);

    if(chat.pFlags === undefined) {
      chat.pFlags = {};
    }

    if(chat.pFlags.min) {
      if(oldChat !== undefined) {
        return;
      }
    }

    if(chat._ === 'channel' &&
        chat.participants_count === undefined &&
        oldChat !== undefined &&
        oldChat.participants_count) {
      chat.participants_count = oldChat.participants_count;
    }

    /* if(chat.username) {
      let searchUsername = searchIndexManager.cleanUsername(chat.username);
      this.usernames[searchUsername] = chat.id;
    } */

    let changedPhoto = false, changedTitle = false;
    if(oldChat === undefined) {
      this.chats[chat.id] = chat;
    } else {
      const oldPhoto = oldChat.photo?.photo_small;
      const newPhoto = chat.photo?.photo_small;
      if(JSON.stringify(oldPhoto) !== JSON.stringify(newPhoto)) {
        changedPhoto = true;
      }

      if(oldChat.title !== chat.title) {
        changedTitle = true;
      }

      safeReplaceObject(oldChat, chat);
      rootScope.broadcast('chat_update', chat.id);
    }

    if(changedPhoto) {
      rootScope.broadcast('avatar_update', -chat.id);
    }

    if(changedTitle) {
      rootScope.broadcast('peer_title_edit', -chat.id);
    }
  }

  public getChat(id: number) {
    if(id < 0) id = -id;
    return this.chats[id] || {_: 'chatEmpty', id, deleted: true, access_hash: '', pFlags: {}/* this.channelAccess[id] */};
  }

  public combineParticipantBannedRights(id: number, rights: ChatBannedRights) {
    const chat: Chat.channel = this.getChat(id);

    if(chat.default_banned_rights) {
      rights = copy(rights);
      const defaultRights = chat.default_banned_rights.pFlags;
      for(let i in defaultRights) {
        // @ts-ignore
        rights.pFlags[i] = defaultRights[i];
      }
    }

    return rights;
  }

  public hasRights(id: number, action: ChatRights, rights?: ChatAdminRights | ChatBannedRights) {
    const chat: Chat = this.getChat(id);
    if(chat._ === 'chatEmpty') return false;

    if(chat._ === 'chatForbidden' ||
        chat._ === 'channelForbidden' ||
        (chat as Chat.chat).pFlags.kicked ||
        (chat.pFlags.left && !(chat as Chat.channel).pFlags.megagroup)) {
      return false;
    }

    if(chat.pFlags.creator && rights === undefined) {
      return true;
    }

    if(!rights) {
      rights = chat.admin_rights || (chat as Chat.channel).banned_rights || chat.default_banned_rights;
    }
    
    if(!rights) {
      return false;
    }

    let myFlags: Partial<{[flag in keyof ChatBannedRights['pFlags'] | keyof ChatAdminRights['pFlags']]: true}> = {};
    if(rights) myFlags = rights.pFlags as any;

    switch(action) {
      case 'embed_links':
      case 'send_games':
      case 'send_gifs':
      case 'send_inline':
      case 'send_media':
      case 'send_messages':
      case 'send_polls':
      case 'send_stickers': {
        if(rights._ === 'chatBannedRights' && myFlags[action]) {
          return false;
        }

        if(chat._ === 'channel') {
          if((!chat.pFlags.megagroup && !myFlags.post_messages)) {
            return false;
          }
        }

        break;
      }

      // * revoke foreign messages
      case 'delete_messages': {
        return !!myFlags.delete_messages;
      }

      case 'pin_messages': {
        return rights._ === 'chatAdminRights' ? myFlags[action] || !!myFlags.post_messages : !myFlags[action];
      }

      case 'invite_users':
      case 'change_info': {
        return rights._ === 'chatAdminRights' ? myFlags[action] : !myFlags[action];
      }

      // * only creator can do that
      case 'change_type':
      case 'delete_chat': {
        return false;
      }

      case 'change_permissions': {
        return rights._ === 'chatAdminRights' && myFlags['ban_users'];
      }

      case 'view_participants': {
        return !!(chat._ === 'chat' || !chat.pFlags.broadcast || chat.pFlags.creator || chat.admin_rights);
      }
    }

    return true;
  }

  public editChatDefaultBannedRights(id: number, banned_rights: ChatBannedRights) {
    const chat: Chat.chat = this.getChat(id);
    if(chat.default_banned_rights) {
      if(chat.default_banned_rights.until_date === banned_rights.until_date && deepEqual(chat.default_banned_rights.pFlags, banned_rights.pFlags)) {
        return Promise.resolve();
      }
    }
    
    return apiManager.invokeApi('messages.editChatDefaultBannedRights', {
      peer: appPeersManager.getInputPeerById(-id),
      banned_rights
    }).then(this.onChatUpdated.bind(this, id));
  }

  /* public resolveUsername(username: string) {
    return this.usernames[username] || 0;
  } */

  /* public saveChannelAccess(id: number, accessHash: string) {
    this.channelAccess[id] = accessHash;
  } */

  /* public saveIsMegagroup(id: number) {
    this.megagroups[id] = true;
  } */

  public isChannel(id: number) {
    if(id < 0) id = -id;
    const chat = this.chats[id];
    if(chat && (chat._ === 'channel' || chat._ === 'channelForbidden')/*  || this.channelAccess[id] */) {
      return true;
    }
    return false;
  }

  public isMegagroup(id: number) {
    /* if(this.megagroups[id]) {
      return true;
    } */

    const chat = this.chats[id];
    if(chat && chat._ === 'channel' && chat.pFlags.megagroup) {
      return true;
    }
    return false;
  }

  public isBroadcast(id: number) {
    return this.isChannel(id) && !this.isMegagroup(id);
  }

  public getChannelInput(id: number): InputChannel {
    if(id < 0) id = -id;
    const chat: Chat = this.getChat(id);
    if(chat._ === 'chatEmpty' || !(chat as Chat.channel).access_hash) {
      return {
        _: 'inputChannelEmpty'
      };
    } else {
      return {
        _: 'inputChannel',
        channel_id: id,
        access_hash: (chat as Chat.channel).access_hash/*  || this.channelAccess[id] */ || '0'
      };
    }
  }

  public getChatInputPeer(id: number): InputPeer.inputPeerChat {
    return {
      _: 'inputPeerChat',
      chat_id: id
    };
  }

  public getChannelInputPeer(id: number): InputPeer.inputPeerChannel {
    return {
      _: 'inputPeerChannel',
      channel_id: id,
      access_hash: this.getChat(id).access_hash/*  || this.channelAccess[id] */ || 0
    };
  }

  public hasChat(id: number, allowMin?: true) {
    const chat = this.chats[id]
    return isObject(chat) && (allowMin || !chat.pFlags.min);
  }

  public getChatPhoto(id: number) {
    const chat: Chat.chat = this.getChat(id);

    return chat && chat.photo || {
      _: 'chatPhotoEmpty'
    };
  }

  public getChatString(id: number) {
    const chat = this.getChat(id);
    if(this.isChannel(id)) {
      return (this.isMegagroup(id) ? 's' : 'c') + id + '_' + chat.access_hash;
    }
    return 'g' + id;
  }

  public getChatMembersString(id: number) {
    const chat = this.getChat(id);
    const chatFull = appProfileManager.chatsFull[id];
    let count: number;
    if(chatFull) {
      if(chatFull._ === 'channelFull') {
        count = chatFull.participants_count;
      } else {
        count = (chatFull.participants as ChatParticipants.chatParticipants).participants?.length;
      }
    } else {
      count = chat.participants_count || chat.participants?.participants.length;
    }

    const isChannel = this.isBroadcast(id);
    count = count || 1;

    let key: LangPackKey = isChannel ? 'Peer.Status.Subscribers' : 'Peer.Status.Member';
    return i18n(key, [numberThousandSplitter(count)]);
  }

  public wrapForFull(id: number, fullChat: any) {
    const chatFull = copy(fullChat);
    const chat = this.getChat(id);

    if(!chatFull.participants_count) {
      chatFull.participants_count = chat.participants_count;
    }

    if(chatFull.participants &&
        chatFull.participants._ === 'chatParticipants') {
      chatFull.participants.participants = this.wrapParticipants(id, chatFull.participants.participants);
    }

    if(chatFull.about) {
      chatFull.rAbout = RichTextProcessor.wrapRichText(chatFull.about, {noLinebreaks: true});
    }

    //chatFull.peerString = this.getChatString(id);
    chatFull.chat = chat;

    return chatFull;
  }

  public wrapParticipants(id: number, participants: any[]) {
    const chat = this.getChat(id);
    const myId = appUsersManager.getSelf().id;
    if(this.isChannel(id)) {
      const isAdmin = chat.pFlags.creator;
      participants.forEach((participant) => {
        participant.canLeave = myId === participant.user_id;
        participant.canKick = isAdmin && participant._ === 'channelParticipant';

        // just for order by last seen
        participant.user = appUsersManager.getUser(participant.user_id);
      });
    } else {
      const isAdmin = chat.pFlags.creator || chat.pFlags.admins_enabled && chat.pFlags.admin;
      participants.forEach((participant) => {
        participant.canLeave = myId === participant.user_id;
        participant.canKick = !participant.canLeave && (
          chat.pFlags.creator ||
          participant._ === 'chatParticipant' && (isAdmin || myId === participant.inviter_id)
        );

        // just for order by last seen
        participant.user = appUsersManager.getUser(participant.user_id);
      });
    }

    return participants;
  }

  public createChannel(title: string, about: string): Promise<number> {
    return apiManager.invokeApi('channels.createChannel', {
      broadcast: true,
      title,
      about
    }).then((updates: any) => {
      apiUpdatesManager.processUpdateMessage(updates);

      const channelId = updates.chats[0].id;
      rootScope.broadcast('history_focus', {peerId: -channelId});

      return channelId;
    });
  }

  public inviteToChannel(id: number, userIds: number[]) {
    const input = this.getChannelInput(id);
    const usersInputs = userIds.map(u => appUsersManager.getUserInput(u));

    return apiManager.invokeApi('channels.inviteToChannel', {
      channel: input,
      users: usersInputs
    }).then(updates => {
      apiUpdatesManager.processUpdateMessage(updates);
    });
  }

  public createChat(title: string, userIds: number[]): Promise<number> {
    return apiManager.invokeApi('messages.createChat', {
      users: userIds.map(u => appUsersManager.getUserInput(u)),
      title
    }).then(updates => {
      apiUpdatesManager.processUpdateMessage(updates);

      const chatId = (updates as any as Updates.updates).chats[0].id;
      rootScope.broadcast('history_focus', {peerId: -chatId});

      return chatId;
    });
  }

  public async getOnlines(id: number): Promise<number> {
    if(this.isMegagroup(id)) {
      const timestamp = Date.now() / 1000 | 0;
      const cached = this.megagroupOnlines[id] ?? (this.megagroupOnlines[id] = {timestamp: 0, onlines: 1});
      if((timestamp - cached.timestamp) < 60) {
        return cached.onlines;
      }

      const res = await apiManager.invokeApi('messages.getOnlines', {
        peer: this.getChannelInputPeer(id)
      });

      const onlines = res.onlines ?? 1;
      cached.timestamp = timestamp;
      cached.onlines = onlines;

      return onlines;
    } else if(this.isBroadcast(id)) {
      return 1;
    }

    const chatInfo = await appProfileManager.getChatFull(id);
    const _participants = (chatInfo as ChatFull.chatFull).participants as ChatParticipants.chatParticipants;
    if(_participants && _participants.participants) {
      const participants = _participants.participants;

      return participants.reduce((acc: number, participant) => {
        const user = appUsersManager.getUser(participant.user_id);
        if(user && user.status && user.status._ === 'userStatusOnline') {
          return acc + 1;
        }

        return acc;
      }, 0);
    } else {
      return 1;
    }
  }

  private onChatUpdated = (chatId: number, updates: any) => {
    //console.log('onChatUpdated', chatId, updates);

    apiUpdatesManager.processUpdateMessage(updates);
    if(updates &&
        /* updates.updates &&
        updates.updates.length && */
        this.isChannel(chatId)) {
      appProfileManager.invalidateChannelParticipants(chatId);
    }
  };

  public leaveChannel(id: number) {
    return apiManager.invokeApi('channels.leaveChannel', {
      channel: this.getChannelInput(id)
    }).then(this.onChatUpdated.bind(this, id));
  }

  public joinChannel(id: number) {
    return apiManager.invokeApi('channels.joinChannel', {
      channel: this.getChannelInput(id)
    }).then(this.onChatUpdated.bind(this, id));
  }

  public addChatUser(id: number, userId: number, fwdLimit = 100) {
    return apiManager.invokeApi('messages.addChatUser', {
      chat_id: id,
      user_id: appUsersManager.getUserInput(userId),
      fwd_limit: fwdLimit
    }).then(this.onChatUpdated.bind(this, id));
  }

  public deleteChatUser(id: number, userId: number) {
    return apiManager.invokeApi('messages.deleteChatUser', {
      chat_id: id,
      user_id: appUsersManager.getUserInput(userId)
    }).then(this.onChatUpdated.bind(this, id));
  }

  public leaveChat(id: number, flushHistory = true) {
    let promise: Promise<any> = this.deleteChatUser(id, appUsersManager.getSelf().id)
    if(flushHistory) promise = promise.then(() => {
      return appMessagesManager.flushHistory(-id);
    });
    return promise;;
  }

  public leave(id: number) {
    return this.isChannel(id) ? this.leaveChannel(id) : this.leaveChat(id);
  }

  public delete(id: number) {
    return this.isChannel(id) ? this.deleteChannel(id) : this.deleteChat(id);
  }

  public deleteChannel(id: number) {
    return apiManager.invokeApi('channels.deleteChannel', {
      channel: this.getChannelInput(id)
    }).then(this.onChatUpdated.bind(this, id));
  }

  public deleteChat(id: number) {
    //return this.leaveChat(id).then(() => {
      return apiManager.invokeApi('messages.deleteChat', {
        chat_id: id
      });
    //});
  }

  public migrateChat(id: number): Promise<number> {
    const chat: Chat = this.getChat(id);
    if(chat._ === 'channel') return Promise.resolve(chat.id);
    return apiManager.invokeApi('messages.migrateChat', {
      chat_id: id
    }).then((updates) => {
      this.onChatUpdated(id, updates);
      const update: Update.updateChannel = (updates as Updates.updates).updates.find(u => u._ === 'updateChannel') as any;
      return update.channel_id;
    });
  }

  public updateUsername(id: number, username: string) {
    return apiManager.invokeApi('channels.updateUsername', {
      channel: this.getChannelInput(id),
      username
    }).then((bool) => {
      if(bool) {
        const chat: Chat.channel = this.getChat(id);
        chat.username = username;
      }

      return bool;
    });
  }

  public editPhoto(id: number, inputFile: InputFile) {
    const inputChatPhoto: InputChatPhoto = {
      _: 'inputChatUploadedPhoto',
      file: inputFile
    };

    let promise: any;
    if(this.isChannel(id)) {
      promise = apiManager.invokeApi('channels.editPhoto', {
        channel: this.getChannelInput(id),
        photo: inputChatPhoto
      });
    } else {
      promise = apiManager.invokeApi('messages.editChatPhoto', {
        chat_id: id,
        photo: inputChatPhoto
      });
    }

    return promise.then((updates: any) => {
      apiUpdatesManager.processUpdateMessage(updates);
    });
  }

  public editTitle(id: number, title: string) {
    let promise: any;

    if(this.isChannel(id)) {
      promise = apiManager.invokeApi('channels.editTitle', {
        channel: this.getChannelInput(id),
        title
      });
    } else {
      promise = apiManager.invokeApi('messages.editChatTitle', {
        chat_id: id,
        title
      });
    }

    return promise.then((updates: any) => {
      apiUpdatesManager.processUpdateMessage(updates);
    });
  }

  public editAbout(id: number, about: string) {
    return apiManager.invokeApi('messages.editChatAbout', {
      peer: appPeersManager.getInputPeerById(-id),
      about
    }).then(bool => {
      //apiUpdatesManager.processUpdateMessage(updates);
      rootScope.broadcast('peer_bio_edit', -id);
    });
  }

  public editBanned(id: number, participant: number | ChannelParticipant, banned_rights: ChatBannedRights) {
    const userId = typeof(participant) === 'number' ? participant : participant.user_id;
    return apiManager.invokeApi('channels.editBanned', {
      channel: this.getChannelInput(id),
      user_id: appUsersManager.getUserInput(userId),
      banned_rights
    }).then((updates) => {
      this.onChatUpdated(id, updates);

      if(typeof(participant) !== 'number') {
        const timestamp = Date.now() / 1000 | 0;
        apiUpdatesManager.processUpdateMessage({
          _: 'updateShort',
          update: {
            _: 'updateChannelParticipant',
            channel_id: id,
            date: timestamp,
            //qts: 0,
            user_id: userId,
            prev_participant: participant,
            new_participant: Object.keys(banned_rights.pFlags).length ? {
              _: 'channelParticipantBanned',
              date: timestamp,
              banned_rights,
              kicked_by: appUsersManager.getSelf().id,
              user_id: userId,
              pFlags: {}
            } : undefined
          } as Update.updateChannelParticipant
        });
      }
    });
  }

  public clearChannelParticipantBannedRights(id: number, participant: number | ChannelParticipant) {
    return this.editBanned(id, participant, {
      _: 'chatBannedRights',
      until_date: 0,
      pFlags: {}
    });
  }
  
  public kickFromChannel(id: number, participant: number | ChannelParticipant) {
    return this.editBanned(id, participant, {
      _: 'chatBannedRights',
      until_date: 0,
      pFlags: {
        view_messages: true
      }
    });
  }
}

const appChatsManager = new AppChatsManager();
MOUNT_CLASS_TO.appChatsManager = appChatsManager;
export default appChatsManager;
