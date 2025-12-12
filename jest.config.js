export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  // 병렬 실행에 따른 포트 충돌을 피하기 위해 워커를 1로 제한
  maxWorkers: 1,
};
