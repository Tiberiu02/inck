export default class Profiler {
  static getProfiler(): object {
    if (!window["profiler"]) window["profiler"] = {};
    return window["profiler"];
  }

  static start(name: string): void {
    if (!this.getProfiler()[name]) {
      this.getProfiler()[name] = {
        sum: 0,
        cnt: 0,
      };
    }

    if (this.getProfiler()[name].startTime)
      throw new Error("Measurement already started: " + name);

    this.getProfiler()[name].startTime = performance.now();
  }

  static stop(name: string) {
    const t = performance.now() - this.getProfiler()[name].startTime;

    if (!this.getProfiler()[name].startTime)
      throw new Error("Measurement not started: " + name);

    this.getProfiler()[name].sum += t;
    this.getProfiler()[name].cnt += 1;
    this.getProfiler()[name].startTime = undefined;
  }

  static performance(name: string) {
    if (!this.getProfiler()[name] || !this.getProfiler()[name].cnt)
      throw new Error("No measurements ever made: " + name);

    return this.getProfiler()[name].sum / this.getProfiler()[name].cnt;
  }

  static measure(f: () => any) {
    const start = performance.now();
    f();
    return performance.now() - start;
  }

  static reset(name: string) {
    delete this.getProfiler()[name];
  }
}
