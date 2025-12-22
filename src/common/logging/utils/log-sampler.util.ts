/**
 * Log sampling utility for high-volume endpoints
 * Helps reduce log volume while maintaining observability
 */
export class LogSampler {
  /**
   * Determine if a log should be sampled based on sampling rate
   * @param samplingRate - Rate between 0 and 1 (1 = log all, 0.1 = log 10%)
   * @returns true if log should be written
   */
  static shouldSample(samplingRate: number = 1): boolean {
    if (samplingRate >= 1) {
      return true; // Log everything
    }

    if (samplingRate <= 0) {
      return false; // Log nothing
    }

    return Math.random() < samplingRate;
  }

  /**
   * Get sampling rate based on log level and endpoint
   * Errors are always logged, but info/debug can be sampled
   */
  static getSamplingRate(
    level: string,
    endpoint?: string,
    defaultRate: number = 1
  ): number {
    // Always log errors
    if (level === 'error') {
      return 1;
    }

    // High-volume endpoints can be sampled
    const highVolumeEndpoints = [
      '/health',
      '/metrics',
      '/v1/payments', // Can be high volume
    ];

    if (endpoint && highVolumeEndpoints.some((ep) => endpoint.includes(ep))) {
      // Sample 10% of non-error logs for high-volume endpoints
      return level === 'warn' ? 0.5 : 0.1;
    }

    return defaultRate;
  }
}

