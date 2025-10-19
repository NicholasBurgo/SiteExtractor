/**
 * Metrics and analytics utilities
 * Provides performance metrics, scoring, and analysis functions
 */

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidenceScore(factors: {
  sourceReliability: number; // 0-1
  dataCompleteness: number; // 0-1
  consistencyScore: number; // 0-1
  validationPassed: boolean;
  recencyScore?: number; // 0-1
}): number {
  const { sourceReliability, dataCompleteness, consistencyScore, validationPassed, recencyScore = 1 } = factors;
  
  // Base score from factors
  let score = (sourceReliability * 0.3) + (dataCompleteness * 0.3) + (consistencyScore * 0.2) + (recencyScore * 0.2);
  
  // Boost for validation
  if (validationPassed) {
    score *= 1.1;
  }
  
  return Math.min(1, Math.max(0, score));
}

/**
 * Calculate data completeness score
 */
export function calculateCompletenessScore(data: Record<string, any>, requiredFields: string[]): number {
  const presentFields = requiredFields.filter(field => 
    data[field] !== undefined && 
    data[field] !== null && 
    data[field] !== '' &&
    (typeof data[field] !== 'object' || Object.keys(data[field]).length > 0)
  );
  
  return presentFields.length / requiredFields.length;
}

/**
 * Calculate consistency score between multiple data sources
 */
export function calculateConsistencyScore(sources: Array<Record<string, any>>): number {
  if (sources.length <= 1) return 1;
  
  const fields = Object.keys(sources[0]);
  let consistentFields = 0;
  
  for (const field of fields) {
    const values = sources.map(source => source[field]).filter(value => value !== undefined);
    if (values.length > 1) {
      const uniqueValues = new Set(values);
      if (uniqueValues.size === 1) {
        consistentFields++;
      }
    }
  }
  
  return fields.length > 0 ? consistentFields / fields.length : 0;
}

/**
 * Calculate performance metrics for extraction
 */
export function calculatePerformanceMetrics(startTime: number, endTime: number, dataSize: number): {
  duration: number;
  throughput: number; // items per second
  efficiency: number; // items per millisecond
} {
  const duration = endTime - startTime;
  const throughput = duration > 0 ? dataSize / (duration / 1000) : 0;
  const efficiency = duration > 0 ? dataSize / duration : 0;
  
  return {
    duration,
    throughput: Math.round(throughput * 100) / 100,
    efficiency: Math.round(efficiency * 1000) / 1000
  };
}

/**
 * Calculate quality score for extracted data
 */
export function calculateQualityScore(data: {
  completeness: number;
  accuracy: number;
  consistency: number;
  relevance: number;
}): number {
  const { completeness, accuracy, consistency, relevance } = data;
  
  // Weighted average with emphasis on accuracy and relevance
  return (completeness * 0.2) + (accuracy * 0.4) + (consistency * 0.2) + (relevance * 0.2);
}

/**
 * Calculate relevance score based on context
 */
export function calculateRelevanceScore(data: any, context: {
  targetDomain?: string;
  expectedFields?: string[];
  contentType?: string;
}): number {
  let score = 0.5; // Base score
  
  // Boost for domain relevance
  if (context.targetDomain && data.domain) {
    if (data.domain.includes(context.targetDomain)) {
      score += 0.2;
    }
  }
  
  // Boost for expected fields
  if (context.expectedFields) {
    const presentFields = context.expectedFields.filter(field => 
      data[field] !== undefined && data[field] !== null
    );
    score += (presentFields.length / context.expectedFields.length) * 0.3;
  }
  
  return Math.min(1, score);
}

/**
 * Calculate freshness score based on timestamp
 */
export function calculateFreshnessScore(timestamp: number, maxAge: number = 86400000): number {
  const age = Date.now() - timestamp;
  return Math.max(0, 1 - (age / maxAge));
}

/**
 * Calculate diversity score for a collection of items
 */
export function calculateDiversityScore(items: any[], keyExtractor: (item: any) => string): number {
  if (items.length <= 1) return 1;
  
  const uniqueKeys = new Set(items.map(keyExtractor));
  return uniqueKeys.size / items.length;
}

/**
 * Calculate error rate
 */
export function calculateErrorRate(totalItems: number, errorItems: number): number {
  return totalItems > 0 ? errorItems / totalItems : 0;
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(totalItems: number, successItems: number): number {
  return totalItems > 0 ? successItems / totalItems : 0;
}

/**
 * Calculate average processing time
 */
export function calculateAverageProcessingTime(times: number[]): number {
  if (times.length === 0) return 0;
  return times.reduce((sum, time) => sum + time, 0) / times.length;
}

/**
 * Calculate percentile
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate correlation coefficient
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(metrics: {
  totalItems: number;
  successItems: number;
  errorItems: number;
  totalTime: number;
  averageTime: number;
  throughput: number;
}): {
  summary: string;
  details: Record<string, any>;
} {
  const { totalItems, successItems, errorItems, totalTime, averageTime, throughput } = metrics;
  
  const successRate = calculateSuccessRate(totalItems, successItems);
  const errorRate = calculateErrorRate(totalItems, errorItems);
  
  const summary = `Processed ${totalItems} items in ${totalTime}ms. Success rate: ${(successRate * 100).toFixed(1)}%, Throughput: ${throughput.toFixed(2)} items/sec`;
  
  const details = {
    totalItems,
    successItems,
    errorItems,
    successRate: Math.round(successRate * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    totalTime,
    averageTime: Math.round(averageTime * 100) / 100,
    throughput: Math.round(throughput * 100) / 100
  };
  
  return { summary, details };
}

