/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // --runInBand wird als CLI-Flag übergeben (nicht als config-Option)
  testTimeout: 15000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/db/database.js',
    '!server/db/sqliteStore.js',
    '!server/db/pgStore.js',
    '!server/migrate-json-to-sqlite.js',
    '!server/testUsers.js',
  ],
}
