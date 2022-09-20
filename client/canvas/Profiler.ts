export default class Profiler {
  measures: { [name: string]: { startTime?: number; sum: number; cnt: number } };

  static getProfiler(): Profiler {
    if (!window.profiler) {
      window.profiler = new Profiler();
      window.profiler.measures = {};
    }
    return window.profiler;
  }

  static start(name: string): void {
    if (!(name in Profiler.getProfiler().measures)) {
      Profiler.getProfiler().measures[name] = {
        sum: 0,
        cnt: 0,
      };
    }

    if (Profiler.getProfiler().measures[name].startTime) throw new Error("Measurement already started: " + name);

    Profiler.getProfiler().measures[name].startTime = performance.now();
  }

  static stop(name: string) {
    const t = performance.now() - Profiler.getProfiler().measures[name].startTime;

    if (!Profiler.getProfiler().measures[name].startTime) throw new Error("Measurement not started: " + name);

    Profiler.getProfiler().measures[name].sum += t;
    Profiler.getProfiler().measures[name].cnt += 1;
    Profiler.getProfiler().measures[name].startTime = undefined;
  }

  performance(name: string) {
    if (!Profiler.getProfiler().measures[name] || !Profiler.getProfiler().measures[name].cnt)
      throw new Error("No measurements ever made: " + name);

    return Profiler.getProfiler().measures[name].sum / Profiler.getProfiler().measures[name].cnt;
  }

  static measure(f: () => any) {
    const start = performance.now();
    f();
    return performance.now() - start;
  }

  static reset(name: string) {
    delete Profiler.getProfiler().measures[name];
  }
}
