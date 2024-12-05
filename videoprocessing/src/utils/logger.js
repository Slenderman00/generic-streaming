export class ProcessingLogger {
  constructor(videoId, totalResolutions) {
    this.videoId = videoId;
    this.totalResolutions = totalResolutions;
    this.resolutionProgress = new Map();
    this.startTime = Date.now();
  }

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
  }

  async logProgress(resolution, progress) {
    this.resolutionProgress.set(resolution, progress);
    const overallProgress = this.calculateOverallProgress();
    const elapsed = (Date.now() - this.startTime) / 1000;
    const message = `
Video ${this.videoId} Processing Status:
├─ Overall Progress: ${overallProgress.toFixed(1)}%
├─ Current Resolution: ${resolution}
├─ Resolution Progress: ${progress.toFixed(1)}%
├─ Elapsed Time: ${elapsed.toFixed(0)}s
└─ Active Resolutions: ${this.getActiveResolutions()}`;
    await this.log(message, 'info');
  }

  calculateOverallProgress() {
    if (this.resolutionProgress.size === 0) return 0;
    const totalProgress = Array.from(this.resolutionProgress.values())
      .reduce((sum, progress) => sum + progress, 0);
    return totalProgress / this.totalResolutions;
  }

  getActiveResolutions() {
    return Array.from(this.resolutionProgress.entries())
      .map(([res, prog]) => `${res}(${prog.toFixed(1)}%)`)
      .join(', ');
  }

  async logStart() {
    const message = `
Video ${this.videoId} Starting Processing:
├─ Total Resolutions: ${this.totalResolutions}
└─ Start Time: ${new Date().toISOString()}`;
    await this.log(message, 'info');
  }

  async logCompletion() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const message = `
Video ${this.videoId} Processing Completed:
├─ Total Time: ${totalTime}s
├─ Final Resolutions: ${this.getActiveResolutions()}
└─ Completion Time: ${new Date().toISOString()}`;
    await this.log(message, 'info');
  }

  async logError(error, resolution = null) {
    const message = `
Video ${this.videoId} Processing Error:
├─ Resolution: ${resolution || 'N/A'}
├─ Error Time: ${new Date().toISOString()}
├─ Elapsed Time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s
└─ Error: ${error.message}
Stack: ${error.stack}`;
    await this.log(message, 'error');
  }
}