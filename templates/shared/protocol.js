/**
 * 游戏模板协议 SDK v1（T052）—— 六类消息 + instanceId + 同源校验（宪法 P2）
 *
 * 宿主 → 模板：HOST_INIT（下发数据/配置）、HOST_START（开始）
 * 模板 → 宿主：GAME_READY（就绪）、GAME_RESULT（成绩）、GAME_ERROR（错误）
 *
 * 用法（模板内）：
 *   const gp = GameProtocol.create({ onInit(data){...}, onStart(){...} })
 *   gp.boot(DEFAULT_DATA)  // 嵌入 iframe 时等宿主下发；单独打开时直接用默认数据自启
 *   // 数据渲染完成后调用 gp.ready()；游戏结束时 gp.result({...})
 *
 * 自包含原则（宪法 P1）：本 SDK 仅做通信，不依赖任何外部资源；
 * 模板在无父页面（直接打开）时也必须可用。
 */
;(function () {
  'use strict'

  var TYPES = {
    HOST_INIT: 'HOST_INIT',
    HOST_START: 'HOST_START',
    GAME_READY: 'GAME_READY',
    GAME_RESULT: 'GAME_RESULT',
    GAME_ERROR: 'GAME_ERROR',
  }

  var CHANNEL = 'kp-game-v1'

  var state = {
    instanceId: null,
    originOk: null, // 校验函数由宿主注入？不——模板侧用同源校验
    handlers: null,
    embedded: false,
    ready: false,
    started: false,
  }

  function isEmbedded() {
    try {
      return window.parent && window.parent !== window
    } catch (e) {
      return false
    }
  }

  function send(type, payload) {
    if (!isEmbedded()) return
    try {
      window.parent.postMessage({ channel: CHANNEL, type: type, instanceId: state.instanceId, payload: payload || null }, window.location.origin)
    } catch (e) {
      /* 同源 postMessage 不会失败，保险起见吞掉 */
    }
  }

  function validMessage(e) {
    if (e.origin !== window.location.origin) return false // 同源校验
    var m = e.data
    if (!m || typeof m !== 'object') return false
    if (m.channel !== CHANNEL) return false
    // instanceId：首次 HOST_INIT 建立会话，其后必须匹配
    if (m.type === TYPES.HOST_INIT) return true
    return state.instanceId == null || m.instanceId === state.instanceId
  }

  window.addEventListener('message', function (e) {
    if (!validMessage(e)) return
    var m = e.data
    if (m.type === TYPES.HOST_INIT) {
      state.embedded = true
      state.instanceId = m.instanceId || null
      try {
        state.handlers.onInit && state.handlers.onInit(m.payload || {})
      } catch (err) {
        send(TYPES.GAME_ERROR, { message: 'init failed: ' + (err && err.message) })
      }
    } else if (m.type === TYPES.HOST_START) {
      if (state.started) return
      state.started = true
      try {
        state.handlers.onStart && state.handlers.onStart()
      } catch (err) {
        send(TYPES.GAME_ERROR, { message: 'start failed: ' + (err && err.message) })
      }
    }
  })

  window.GameProtocol = {
    TYPES: TYPES,
    isEmbedded: isEmbedded,

    /** 注册处理器并启动：嵌入时等 HOST_INIT，独立打开时用默认数据立即初始化 */
    boot: function (handlers, defaultData) {
      state.handlers = handlers
      if (isEmbedded()) {
        // 宿主可能先于脚本加载发消息？不会——宿主在 iframe load 后才发 HOST_INIT。
        // 兜底：若 800ms 内没等到 INIT（时序异常），视为未接入宿主，用默认数据自启
        setTimeout(function () {
          if (!state.embedded) standalone(defaultData)
        }, 800)
      } else {
        standalone(defaultData)
      }
    },

    /** 模板数据渲染完成、可以开始时调用 */
    ready: function () {
      if (state.ready) return
      state.ready = true
      send(TYPES.GAME_READY, null)
    },

    /** 游戏结束上报：{ score, total, durationMs, answers:[{seq, answer}] } */
    result: function (payload) {
      send(TYPES.GAME_RESULT, payload)
    },

    error: function (message) {
      send(TYPES.GAME_ERROR, { message: String(message || 'unknown') })
    },
  }

  function standalone(defaultData) {
    state.embedded = false
    try {
      state.handlers.onInit && state.handlers.onInit(defaultData || {})
      state.handlers.onStart && state.handlers.onStart()
    } catch (err) {
      console.error('[game] standalone init failed:', err)
    }
  }
})()
