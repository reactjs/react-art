var babel = require('gulp-babel');
var gulp = require('gulp');
var del = require('del');
var runSequence = require('run-sequence');
var shell = require('gulp-shell');

var babelOptions = require('./scripts/babel/options');

var paths = {
  src: [
    'src/**/*.js',
    '!src/**/__tests__/**/*.js',
  ],
  lib: 'lib',
};

gulp.task('clean', function() {
  return del([paths.lib]);
});

gulp.task('lib', function() {
  return gulp
    .src(paths.src)
    .pipe(babel(babelOptions))
    .pipe(gulp.dest(paths.lib));
});

gulp.task('default', function(cb) {
  runSequence('clean', 'lib', cb);
});

gulp.task('build-examples-website', ['clean'], shell.task([[
  'pushd ../react-art-gh-pages',
  'git checkout -- .',
  'git clean -dfx',
  'git pull',
  'rm -rf *',
  'popd',
  'pushd examples/vector-widget',
  'npm install',
  'npm run build',
  'popd',
  'cp -r examples/vector-widget/{index.html,bundle.js} ../react-art-gh-pages',
  'pushd ../react-art-gh-pages',
  'git add -A .',
  'git commit -m "Update website"',
  'popd',
  'echo "react-art-gh-pages ready to push"'
].join(';')]));
