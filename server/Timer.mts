export class Timer {
  private start: number;
  constructor() {
    this.start = Date.now();
  }

  elapsed() {
    return Date.now() - this.start;
  }
}
