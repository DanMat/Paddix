/*
 * Paddix configuration.
 *
 * The leaderboard works out of the box using the browser's localStorage.
 * To share high scores across devices (and across all of Dan's games),
 * fill in a Supabase project URL and its public "anon" key below. Both are
 * safe to expose in client-side code — the database is protected by
 * row-level-security policies (see docs/supabase.sql).
 */
window.PADDIX_CONFIG = {
	// Leave blank to use the local (per-browser) leaderboard.
	supabaseUrl: '',        // e.g. 'https://abcdefgh.supabase.co'
	supabaseAnonKey: '',    // the public anon/publishable key

	// Identifies this game's rows in the shared `scores` table.
	gameId: 'paddix',

	// How many entries the leaderboard shows.
	leaderboardSize: 10
};
