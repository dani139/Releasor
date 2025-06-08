// Log processing utilities for cleaning up Docker logs

export function cleanLogLine(logLine) {
  if (!logLine || typeof logLine !== 'string') {
    return logLine;
  }

  // Remove ANSI color codes (e.g., [90m, [0m, [34m, etc.)
  let cleaned = logLine.replace(/\x1b\[[0-9;]*m/g, '');
  
  // Remove other escape sequences
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  
  // Clean up extra brackets and formatting
  cleaned = cleaned.replace(/\[([0-9]+)m/g, '');
  cleaned = cleaned.replace(/\[0m/g, '');
  
  // Remove role= tags that are repetitive
  cleaned = cleaned.replace(/\[36mrole=\[0m[a-zA-Z]+/g, '');
  cleaned = cleaned.replace(/role=[a-zA-Z]+/g, '');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

export function formatLogEntry(logData) {
  if (!logData || !logData.data) {
    return logData;
  }

  const cleanedData = cleanLogLine(logData.data);
  
  // Extract timestamp if present
  const timestampMatch = cleanedData.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[Z\+\-\d:]*)/);
  const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
  
  // Extract log level (INFO, DEBUG, ERROR, etc.)
  const levelMatch = cleanedData.match(/(DEBUG|INFO|WARN|ERROR|FATAL)/i);
  const level = levelMatch ? levelMatch[1].toUpperCase() : 'INFO';
  
  // Extract the main message (remove timestamp and level)
  let message = cleanedData;
  if (timestampMatch) {
    message = message.replace(timestampMatch[0], '');
  }
  if (levelMatch) {
    message = message.replace(levelMatch[0], '');
  }
  
  // Clean up the message further
  message = message.replace(/^\s*[-\s]*/, '').trim();
  
  // Remove excessive key=value pairs for wuzapi logs
  if (message.includes('wuzapi')) {
    // Keep only important information
    message = message
      .replace(/\[36m[^[]*\[0m/g, '') // Remove color-coded values
      .replace(/\[[0-9]+m/g, '') // Remove any remaining color codes
      .replace(/duration=[0-9.]+\s*/g, '') // Remove duration info
      .replace(/ip=[0-9.:]+\s*/g, '') // Remove IP info
      .replace(/req_id=[a-zA-Z0-9]+\s*/g, '') // Remove request IDs
      .replace(/userid=[a-zA-Z0-9]+\s*/g, '') // Remove user IDs
      .replace(/token=[a-zA-Z0-9_]+\s*/g, '') // Remove tokens
      .replace(/host=[0-9.]+\s*/g, '') // Remove host info
      .replace(/size=[0-9]+\s*/g, '') // Remove size info
      .trim();
  }

  return {
    ...logData,
    data: message,
    timestamp: timestamp,
    level: level,
    cleaned: true
  };
}

export function shouldFilterLogLine(logLine) {
  if (!logLine || typeof logLine !== 'string') {
    return false;
  }

  const cleanLine = logLine.toLowerCase();
  
  // Filter out very verbose debug lines
  const verbosePatterns = [
    'checking event subscription',
    'payload:',
    'data being sent to webhook',
    'user info name from cache',
    'got api request',
    'duration=',
    'req_id='
  ];
  
  return verbosePatterns.some(pattern => cleanLine.includes(pattern));
}

export const LOG_LEVELS = {
  DEBUG: { color: 'text-gray-500', bg: 'bg-gray-100' },
  INFO: { color: 'text-blue-600', bg: 'bg-blue-50' },
  WARN: { color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ERROR: { color: 'text-red-600', bg: 'bg-red-50' },
  FATAL: { color: 'text-red-800', bg: 'bg-red-100' }
};

export function getLogLevelStyle(level) {
  return LOG_LEVELS[level] || LOG_LEVELS.INFO;
} 