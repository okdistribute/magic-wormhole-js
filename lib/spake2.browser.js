module.exports = {
  start: (appid, password) => window.spake2.start(appid, password),
  msg: (state) => window.spake2.msg(state),
  finish: (state, inbound) => window.spake2.finish(state, inbound)
}
