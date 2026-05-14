// Rule-based donation matching: finds the best agent for a donation
// Criteria: nearest agent with matching food type and available capacity

const haversine = require("../../utils/haversine"); // Assumes you have a haversine.js for distance calculation

/**
 * Finds the best agent for a donation
 * @param {Object} donation - { location: {lat, lng}, foodType, quantity }
 * @param {Array} agents - [{ _id, location: {lat, lng}, capacity, assigned, foodTypesHandled }]
 * @returns {Object|null} - Best matching agent or null if none found
 */
function matchDonationToAgent(donation, agents) {
	let bestAgent = null;
	let minDistance = Infinity;

	agents.forEach(agent => {
		// Check if agent can handle this food type and has capacity
		if (
			agent.foodTypesHandled.includes(donation.foodType) &&
			agent.capacity - agent.assigned >= donation.quantity
		) {
			const distance = haversine(
				donation.location.lat,
				donation.location.lng,
				agent.location.lat,
				agent.location.lng
			);
			if (distance < minDistance) {
				minDistance = distance;
				bestAgent = agent;
			}
		}
	});
	return bestAgent;
}

module.exports = { matchDonationToAgent };
