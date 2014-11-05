var gulp = require('gulp');
var gReact = require('gulp-react');
var del = require('del');

gulp.task('clean', function(cb) {
  del(['lib/', 'Flux.js'], cb);
});

gulp.task('default', ['clean'], function() {
  return gulp.src('src/*.js')
             .pipe(gReact({harmony: true}))
             .pipe(gulp.dest('lib'));

});
