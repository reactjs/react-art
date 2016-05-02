var gulp = require('gulp');
var babel = require('gulp-babel');
var del = require('del');
var shell = require('gulp-shell');

gulp.task('clean', function() {
  return del(['lib/', 'Flux.js']);
});

gulp.task('default', ['clean'], function() {
  return gulp.src('src/*.js')
             .pipe(babel())
             .pipe(gulp.dest('lib'));

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
