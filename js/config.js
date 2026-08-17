/*
 * Paddix configuration.
 *
 * High scores use the shared Cloudflare leaderboard (a Worker + D1),
 * namespaced by `gameId` so Paddix's board is its own — see
 * https://github.com/DanMat/retroix-leaderboard . Blank `apiUrl` to fall
 * back to a local (per-browser) leaderboard.
 */
window.PADDIX_CONFIG = {
	apiUrl: 'https://retroix-leaderboard.danmat.workers.dev',

	gameId: 'paddix',
	leaderboardSize: 10
};
