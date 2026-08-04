// utils/urgency.js
// Expiry urgency classification
/**
 * Classify expiry urgency
 * @param {Date} expiryTime
 * @returns {string} 'URGENT' | 'MEDIUM' | 'SAFE'
 */
function classifyUrgency(expiryTime) {
  const now = new Date();
  const diffMs = new Date(expiryTime) - now;
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 2) return 'URGENT';
  if (diffHrs < 5) return 'MEDIUM';
  return 'SAFE';
}
module.exports = { classifyUrgency };
