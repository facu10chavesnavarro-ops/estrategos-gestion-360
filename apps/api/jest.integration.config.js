module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.integration-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['<rootDir>/test/support/load-test-env.js'],
  // Los tests de integración comparten una única base de datos real y hacen
  // TRUNCATE entre corridas: correrlos en paralelo causaría interferencia
  // cruzada entre tests.
  maxWorkers: 1,
};
