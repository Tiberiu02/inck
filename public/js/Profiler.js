export default class Profiler {

  static start(name) {
    if (!window.profiler)
      window.profiler = this
    
    if (!window.profiler[name]) {
      window.profiler[name] = {
        sum: 0,
        cnt: 0
      }
    }

    if (window.profiler[name].startTime)
      throw new Error('Measurement already started: ' + name)

    window.profiler[name].startTime = performance.now()
  }

  static stop(name) {
    const t = performance.now() - window.profiler[name].startTime

    if (!window.profiler[name].startTime)
      throw new Error('Measurement not started: ' + name)

    window.profiler[name].sum += t
    window.profiler[name].cnt += 1
    window.profiler[name].startTime = undefined
  }

  static performance(name) {
    if (!window.profiler[name] || !window.profiler[name].cnt)
      throw new Error('No measurements ever made: ' + name)

    return window.profiler[name].sum / window.profiler[name].cnt
  }

  static measure(f) {
    const start = performance.now()
    f()
    return performance.now() - start
  }

}