import React, { FC, useEffect, useState } from 'react'
import {
  ConversationList,
  ConversationCallbackProps,
} from './components/ConversationList'
import { useStateContext, useEventTracking } from '../common'
import { NimKitCoreTypes } from '@xkit-yx/core-kit'
import packageJson from '../../package.json'
import { observer } from 'mobx-react'

export interface ConversationContainerProps {
  /**
   样式前缀
   */
  prefix?: string
  /**
   公共样式前缀
   */
  commonPrefix?: string
  /**
   会话点击事件
   */
  onSessionItemClick?: (id: string) => void
  /**
   会话删除事件
   */
  onSessionItemDeleteClick?: (id: string) => void
  /**
   会话置顶状态改变事件
   */
  onSessionItemStickTopChange?: (id: string, isTop: boolean) => void
  /**
   会话免打扰状态改变事件
   */
  onSessionItemMuteChange?: (id: string, mute: boolean) => void
  /**
   自定义渲染会话列表为空时内容
   */
  renderSessionListEmpty?: () => JSX.Element | null | undefined
  /**
   自定义渲染会话类型是单聊的内容
   */
  renderCustomP2pSession?: (
    options: {
      session: NimKitCoreTypes.ISession
    } & ConversationCallbackProps
  ) => JSX.Element | null | undefined
  /**
   自定义渲染会话类型是群聊的内容
   */
  renderCustomTeamSession?: (
    options: {
      session: NimKitCoreTypes.ISession
    } & Omit<ConversationCallbackProps, 'onSessionItemMuteChange'>
  ) => JSX.Element | null | undefined
  /**
   自定义会话名称。如果 p2p 会话定义了 renderCustomP2pSession 或群组会话定义了 renderCustomTeamSession 则不生效。
   */
  renderSessionName?: (options: {
    session: NimKitCoreTypes.ISession
  }) => JSX.Element | null | undefined
  /**
   自定义会话消息。如果 p2p 会话定义了 renderCustomP2pSession 或群组会话定义了 renderCustomTeamSession 则不生效。
   */
  renderSessionMsg?: (options: {
    session: NimKitCoreTypes.ISession
  }) => JSX.Element | null | undefined
  /**
   自定义 p2p 会话头像。如果定义了 renderCustomP2pSession 则不生效。
   */
  renderP2pSessionAvatar?: (options: {
    session: NimKitCoreTypes.ISession
  }) => JSX.Element | null | undefined
  /**
   自定义群组会话头像。如果定义了 renderCustomTeamSession 则不生效。
   */
  renderTeamSessionAvatar?: (options: {
    session: NimKitCoreTypes.ISession
  }) => JSX.Element | null | undefined
}

export const ConversationContainer: FC<ConversationContainerProps> = observer(
  ({
    prefix = 'conversation',
    commonPrefix = 'common',
    onSessionItemClick,
    onSessionItemDeleteClick,
    onSessionItemStickTopChange,
    onSessionItemMuteChange,
    renderSessionListEmpty,
    renderCustomP2pSession,
    renderCustomTeamSession,
    renderP2pSessionAvatar,
    renderTeamSessionAvatar,
    renderSessionName,
    renderSessionMsg,
  }) => {
    const { nim, store, initOptions } = useStateContext()

    useEventTracking({
      appkey: initOptions.appkey,
      version: packageJson.version,
      component: 'ConversationUIKit',
      imVersion: nim.version,
    })

    // 处理 team 会话列表 @ 提醒
    const [sessionList, setSessionList] = useState<NimKitCoreTypes.ISession[]>(
      []
    )

    const handleSessionItemClick = async (
      session: NimKitCoreTypes.ISession
    ) => {
      await store.uiStore.selectSession(session.id)
      onSessionItemClick?.(session.id)
    }

    const handleSessionItemDeleteClick = async (
      session: NimKitCoreTypes.ISession
    ) => {
      await store.sessionStore.deleteSessionActive(session.id)
      onSessionItemDeleteClick?.(session.id)
    }

    const handleSessionItemStickTopChange = async (
      session: NimKitCoreTypes.ISession,
      isTop: boolean
    ) => {
      if (isTop) {
        await store.sessionStore.addStickTopSessionActive(session.id)
      } else {
        await store.sessionStore.deleteStickTopSessionActive(session.id)
      }
      onSessionItemStickTopChange?.(session.id, isTop)
    }

    const handleSessionItemMuteChange = async (
      session: NimKitCoreTypes.ISession,
      mute: boolean
    ) => {
      await store.relationStore.setMuteActive({
        account: session.to,
        isAdd: mute,
      })
      onSessionItemMuteChange?.(session.id, mute)
    }

    useEffect(() => {
      const account = store.userStore.myUserInfo.account
      setSessionList([...store.uiStore.sessionList])
      store.uiStore.sessionList.forEach(async (session: any) => {
        if (session.scene === 'team' && session.unread !== 0) {
          let unreadMsgs = [session.lastMsg]
          // 不直接使用 `getHistoryMsgActive`, 因为这个方法有延迟
          if (session.unread > 1) {
            const res = await store.msgStore.getHistoryMsgActive({
              sessionId: session.id,
              endTime: session.lastMsg.time,
              lastMsgId: session.lastMsg.idServer,
              limit: session.unread - 1,
            })
            unreadMsgs = [...unreadMsgs, ...res]
          }
          unreadMsgs.forEach((msg) => {
            if (msg.ext) {
              try {
                const extObj = JSON.parse(msg.ext)
                const yxAitMsg = extObj.yxAitMsg
                if (yxAitMsg) {
                  Object.keys(yxAitMsg).forEach((key) => {
                    if (key === account || key === 'ait_all') {
                      session.beMentioned = true
                    }
                  })
                }
              } catch {}
            }
          })
          setSessionList([...store.uiStore.sessionList])
        }
      })
    }, [
      store.uiStore.sessionList,
      store.userStore.myUserInfo.account,
      store.msgStore,
    ])

    return (
      <ConversationList
        sessions={sessionList}
        // loading={loading}
        selectedSession={store.uiStore.selectedSession}
        onSessionItemClick={handleSessionItemClick}
        onSessionItemDeleteClick={handleSessionItemDeleteClick}
        onSessionItemStickTopChange={handleSessionItemStickTopChange}
        onSessionItemMuteChange={handleSessionItemMuteChange}
        renderCustomP2pSession={renderCustomP2pSession}
        renderCustomTeamSession={renderCustomTeamSession}
        renderSessionListEmpty={renderSessionListEmpty}
        renderP2pSessionAvatar={renderP2pSessionAvatar}
        renderTeamSessionAvatar={renderTeamSessionAvatar}
        renderSessionName={renderSessionName}
        renderSessionMsg={renderSessionMsg}
        prefix={prefix}
        commonPrefix={commonPrefix}
      />
    )
  }
)
