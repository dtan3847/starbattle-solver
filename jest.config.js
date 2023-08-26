module.exports = {
  "transform": {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': ['babel-jest', { configFile: './babel-jest.config.js' }],
  },
  "roots": ["<rootDir>\\src"],
  "collectCoverageFrom": ["src\\**\\*.{js,jsx,ts,tsx}", "!src\\**\\*.d.ts"],
  "setupFiles": ["C:\\Users\\david\\Work\\personal\\starbattle-solver\\.yarn\\cache\\react-app-polyfill-npm-3.0.0-e607e071bd-1bb031080a.zip\\node_modules\\react-app-polyfill\\jsdom.js"],
  "setupFilesAfterEnv": ["<rootDir>\\src\\setupTests.ts"],
  "testMatch": ["<rootDir>\\src\\**\\__tests__\\**\\*.{js,jsx,ts,tsx}", "<rootDir>\\src\\**\\*.{spec,test}.{js,jsx,ts,tsx}"],
  "testEnvironment": "jsdom",
  "transformIgnorePatterns": ["[\\\\\]node_modules[\\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$", "^.+\\.module\\.(css|sass|scss)$"],
  "modulePaths": [],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': 'identity-obj-proxy',
  },
  "moduleFileExtensions": ["web.js", "js", "web.ts", "ts", "web.tsx", "tsx", "json", "web.jsx", "jsx", "node"],
  "watchPlugins": ["jest-watch-typeahead\\filename", "jest-watch-typeahead\\testname"],
  "resetMocks": true,
  "rootDir": "C:\\Users\\david\\Work\\personal\\starbattle-solver",
}