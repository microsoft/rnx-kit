// @ts-check

const { task, series, parallel, option, argv, tscTask, cleanTask, eslintTask } = require('just-scripts');

const path = require('path');

const srcPath = path.join(process.cwd(), 'src');
const libPath = path.join(process.cwd(), 'lib');

module.exports = function preset() {
  option('production');

  task(
    'ts',
    tscTask({
      pretty: true,
      allowJs: true,
      target: 'es6',
      outDir: 'lib',
      module: 'commonjs',
      ...(argv().production && { inlineSources: true, sourceRoot: path.relative(libPath, srcPath) }),
    }),
  );

  task('lint', eslintTask({ files: ['src/.'] }));
  task('clean', cleanTask([libPath]));
  task('build', series('cleanlib', parallel('lint', 'ts')));
  task('no-op', () => {});
};
