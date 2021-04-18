module.exports = {
  start: () => window.spake2.start.apply(window.spake2, ...arguments),
  msg: () => window.spake2.msg.apply(window.spake2, ...arguments),
  finish: () => window.spake2.finish.apply(window.spake2, ...arguments)
}
