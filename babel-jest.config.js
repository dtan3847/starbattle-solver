// See https://github.com/jestjs/jest/issues/12183#issuecomment-1004320665
module.exports = {
  presets: [
    '@babel/preset-env',
    [
      '@babel/preset-react',
      { "runtime": "automatic" }
    ],
    '@babel/preset-typescript'
  ],
  plugins: ['@babel/transform-runtime', 'babel-plugin-transform-import-meta'],
}