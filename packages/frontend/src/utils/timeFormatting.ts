/**
 * Format seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to HH:MM:SS format for longer durations
 */
export function formatTimeLong(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse time string back to seconds
 */
export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

