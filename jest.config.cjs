// jest.config.cjs
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    transform: {
      '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
    },
    transformIgnorePatterns: [
      "node_modules/(?!linq)" // linq 모듈을 제외한 모든 node_modules 내 모듈을 변환에서 제외
    ],
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  };
  