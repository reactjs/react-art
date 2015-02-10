var gulp = require('gulp');
var gReact = require('gulp-react');
var del = require('del');
var shell = require('gulp-shell');

gulp.task('clean', function(cb) {
  del(['lib/', 'Flux.js'], cb);
});

gulp.task('default', ['clean'], function() {
  return gulp.src('src/*.js')
             .pipe(gReact({harmony: true}))
             .pipe(gulp.dest('lib'));

});

gulp.task('build-examples-website', ['clean'], shell.task([
  'git checkout gh-pages',
  'git merge master',
  'cd examples/vector-widget; ../../node_modules/.bin/webpack app.js bundle.js',
  'cp -r examples/* .',
  'git add --all .',
  'git commit -m "Update website"',
  'git push origin gh-pages',
  'git checkout master'
]));
