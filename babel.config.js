// Jest runs without Node's --experimental-vm-modules flag, so a real
// `import()` throws ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG under test.
// In tests only, turn `import('x')` into `Promise.resolve().then(() => require('x'))`
// (jest.mock still applies). The web build keeps real import() so Metro splits
// those modules into separate chunks.
function dynamicImportToRequire({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type !== 'Import') return;
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('resolve')), []),
              t.identifier('then'),
            ),
            [t.arrowFunctionExpression([], t.callExpression(t.identifier('require'), path.node.arguments))],
          ),
        );
      },
    },
  };
}

module.exports = function (api) {
  const isTest = api.env('test');
  api.cache(!isTest);
  return {
    presets: [
      ['babel-preset-expo', { reanimated: !isTest }],
    ],
    plugins: [
      ...isTest ? [dynamicImportToRequire] : [],
      [
        'module-resolver',
        {
          alias: {
            '@legacy': './src/.legacy-screens',
          },
        },
      ],
    ],
  };
};
