function checkUrgency(expiryTime) {
  const now = new Date();
  const expiry = new Date(expiryTime);

  const diffMs = expiry - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 2) return "URGENT";
  if (diffHours <= 5) return "MEDIUM";
  return "SAFE";
}

module.exports = { checkUrgency };