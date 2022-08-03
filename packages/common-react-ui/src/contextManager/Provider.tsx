import {
  NIMInitializeOptions,
  NIMOtherOptions,
} from 'nim-web-sdk-ng/dist/NIM_BROWSER_SDK/NIMInterface'
import React, {
  FC,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  createContext,
  useReducer,
} from 'react'
import { reducer, initialState } from './store'
import { logger } from '../utils'
import { Store, IDispatch } from './types'
import { NimKitCoreFactory, NimKitCoreTypes } from '@xkit-yx/core-kit'
import zh from '../locales/zh'

export interface ContextProps {
  nim?: NimKitCoreTypes.INimKitCore
  state?: Store
  dispatch?: IDispatch
  initOptions?: NIMInitializeOptions
  t?: (str: keyof typeof zh) => string
}

export interface ProviderProps {
  children: ReactNode
  sdkVersion?: 1 | 2
  initOptions: NIMInitializeOptions
  otherOptions?: NIMOtherOptions
  funcOptions?: { [key: string]: (...args: any) => void }
  nimKitCore?: NimKitCoreTypes.INimKitCore
  locale?: 'zh' | 'en'
  localeConfig?: { [key in keyof typeof zh]: string }
  renderImIdle?: () => React.ReactNode
  renderImDisConnected?: () => React.ReactNode
  renderImConnecting?: () => React.ReactNode
}

export const Context = createContext<ContextProps>({})

export const Provider: FC<ProviderProps> = ({
  children,
  initOptions,
  otherOptions,
  funcOptions,
  nimKitCore,
  sdkVersion = 1,
  locale = 'zh',
  localeConfig,
  renderImIdle,
  renderImDisConnected,
  renderImConnecting,
}) => {
  const nim = useMemo(() => {
    let _nim: NimKitCoreTypes.INimKitCore
    if (nimKitCore) {
      _nim = nimKitCore
    } else {
      const NIM = NimKitCoreFactory(sdkVersion)
      _nim = new NIM({ initOptions, otherOptions, funcOptions })
    }
    _nim.connect()
    return _nim
  }, [initOptions, otherOptions, funcOptions, sdkVersion, nimKitCore])

  // @ts-ignore
  const [state, dispatch] = useReducer(reducer, initialState)

  const localeMap = useMemo(
    () => ({
      zh,
    }),
    []
  )

  const t = useCallback(
    (str: keyof typeof zh) => {
      return {
        ...(localeMap[locale] || zh),
        ...localeConfig,
      }[str]
    },
    [locale, localeConfig, localeMap]
  )

  // @ts-ignore
  window.__xkit_store__ = {
    nim,
    state,
    dispatch,
    initOptions,
  }

  useEffect(() => {
    const onLogined = () => {
      logger.log('im logined')
      ;(dispatch as IDispatch)({
        type: 'changeConnectState',
        payload: 'connected',
      })
    }

    const ondisconnect = () => {
      logger.log('im disconnect')
      ;(dispatch as IDispatch)({
        type: 'changeConnectState',
        payload: 'disconnected',
      })
    }

    const onwillReconnect = () => {
      logger.log('im willReconnect')
      ;(dispatch as IDispatch)({
        type: 'changeConnectState',
        payload: 'connecting',
      })
    }

    const onkicked = () => {
      logger.log('im kicked')
      ;(dispatch as IDispatch)({
        type: 'changeConnectState',
        payload: 'disconnected',
      })
    }

    nim.on('logined', onLogined)
    nim.on('disconnect', ondisconnect)
    nim.on('willReconnect', onwillReconnect)
    nim.on('kicked', onkicked)

    return () => {
      nim.disconnect()
      nim.off('logined', onLogined)
      nim.off('disconnect', ondisconnect)
      nim.off('willReconnect', onwillReconnect)
      nim.off('kicked', onkicked)
      ;(dispatch as IDispatch)({
        type: 'changeConnectState',
        payload: 'disconnected',
      })
    }
  }, [nim])

  return (
    <Context.Provider
      value={{
        nim,
        state,
        dispatch,
        initOptions,
        t,
      }}
    >
      {(() => {
        switch ((state as Store).connectState) {
          case 'connected':
            return children
          case 'idle':
            return renderImIdle ? renderImIdle() : null
          case 'connecting':
            return renderImConnecting ? (
              renderImConnecting()
            ) : (
              <span>Loading……</span>
            )
          case 'disconnected':
            return renderImDisConnected ? (
              renderImDisConnected()
            ) : (
              <span>当前网络不可用，请检查网络设置，刷新页面</span>
            )
        }
      })()}
    </Context.Provider>
  )
}
