var gulp = require('gulp'), //基础库
    concat = require('gulp-concat'), //合并文件
    connect = require('gulp-connect'),
    less = require('gulp-less'), //less解析
    jshint = require('gulp-jshint'), //js检查
    header = require('gulp-header'),
    footer = require('gulp-footer'),
    uglify = require('gulp-uglify'), //js压缩
    rename = require('gulp-rename'), //重命名
    clean = require('gulp-clean'), //清空文件夹
    open = require('gulp-open'),
    del = require('del'),
    mkdirp = require('mkdirp'),


    livereload = require('gulp-livereload'), //livereload

    //更新过时的gulp-minify-css
    cleanCSS = require('gulp-clean-css'),
    //生成sourcemap
    sourcemaps = require('gulp-sourcemaps'),
    paths = {
        root: './',
        dist: {
            root: 'dist/',
            styles: 'dist/css/',
            scripts: 'dist/js/',
            fonts: 'dist/fonts/'
        },
        source: {
            root: 'src/',
            styles: 'src/less/',
            scripts: 'src/js/',
            fonts: 'src/fonts/'
        },
        assets: {
            root: 'assets/',
            styles: 'assets/less/',
            scripts: 'assets/libs/',
            fonts: 'assets/fonts/'
        },

        examples: {
            root: 'examples/',
            index: 'examples/index.html'
        }
    },
    d6 = {
        filename: 'd6',
        jsFiles: [
            'assets/libs/underscore.js',
            'src/js/core.js',
            'src/js/iscroll.js',
            'src/js/zepto.extend.js',
            'src/js/$.extend.js',
            'src/js/widgets/slider/slider.js',
            'src/js/swiper.min.js',
            'src/js/widgets/slider/touch.js',
            'src/js/widgets/slider/guide.js',
            'src/js/widgets/slider/multiview.js',
            'src/js/widgets/slider/gestures.js',
            'src/js/widgets/refresh.js',
            'src/js/widgets/accordion.js',
            'src/js/widgets/tabs.js',
            'src/js/widgets/progress.js',
            'src/js/widgets/dialog.js',
            'src/js/widgets/tabbar.js',
            'src/js/widgets/toast.js',
            'src/js/widgets/loading.js',
            'src/js/widgets/popupmenu.js',
            'src/js/widgets/pathmenu.js',
            
            'src/js/widgets/picker.js',
            'src/js/widgets/citypicker.js',
            'src/js/widgets/dtpicker.js',
            'src/js/widgets/actionSheet.js',
            'src/js/widgets/fullpage.js',
           // 'src/js/widgets/slider/slide.js',
            'src/js/widgets/navslide.js',
            'src/js/widgets/switch.js', 
            'src/js/widgets/generate.js'
 
        ]
    },
    zepto = {
        filename: 'zepto',
        jsFiles: [
            'assets/zepto/plugins/zepto.js',
            'assets/zepto/plugins/event.js',
            'assets/zepto/plugins/ajax.js',
            'assets/zepto/plugins/fx.js',
            'assets/zepto/plugins/fx_methods.js',
            'assets/zepto/plugins/data.js',
            'assets/zepto/plugins/detect.js',
            'assets/zepto/plugins/touch.js'
        ]
    },
    banner = {
        header: [
            '/**',
            ' * Released on: <%= date.year %>-<%= date.month %>-<%= date.day %>',
            ' * =====================================================',
            ' * <%= name %> v1.0.1 (https://github.com/369cloud/D6.git)',
            ' * =====================================================',
            ' */',
            ''
        ].join('\n'),
        footer: [
            '/**',
            ' * Released on: <%= date.year %>-<%= date.month %>-<%= date.day %>',
            ' */',
            ''
        ].join('\n')
    },
    date = {
        year: new Date().getFullYear(),
        month: ('1 2 3 4 5 6 7 8 9 10 11 12').split(' ')[new Date().getMonth()],
        day: new Date().getDate()
    };


// 清空dist样式
gulp.task('cleanDist', function(cb) {
    return del([paths.dist.root + '**']);
});

// dist样式处理
gulp.task('dist-css', function(cb) {
    gulp.src('src/less/d6.less')
        .pipe(less())
        .pipe(gulp.dest(paths.dist.styles))
        .pipe(livereload())
        .on('end', function() {
            cb();
        });
});

//dist字体
gulp.task('dist-font', function(cb) {
    gulp.src(paths.source.fonts + '*.*')
        .pipe(gulp.dest(paths.dist.fonts))
        .on('finish', function() {
            cb();
        });
});


// 样式处理
//gulp.task('dist-styles', gulp.series('cleanDist', 'dist-css', 'dist-font', 'dist-font-ex'));
gulp.task('dist-styles', gulp.series('cleanDist', 'dist-css', 'dist-font'));

// js处理
gulp.task('dist-d6', function(cb) {
    gulp.src(d6.jsFiles) //要合并的文件
        .pipe(concat(d6.filename + ".js")) // 合并匹配到的js文件并命名为 "all.js"
        .pipe(gulp.dest(paths.dist.scripts))
        .pipe(livereload())
        .on('end', function() {
            cb();
        });
});

// dom处理
gulp.task('dist-zepto', function(cb) {
    gulp.src(zepto.jsFiles) //要合并的文件
        .pipe(concat(zepto.filename + ".js")) // 合并匹配到的js文件并命名为 "all.js"
        .pipe(gulp.dest(paths.assets.scripts))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(uglify())
        .pipe(gulp.dest(paths.assets.scripts))
        .pipe(livereload())
        .on('end', function() {
            cb();
        });
});

//gulp.task('dist-js', gulp.series('dist-d6', 'dist-zepto')); //仅合并d6，提高编译速度
gulp.task('dist-js', gulp.series('dist-d6'));

gulp.task('build-dist', gulp.series('dist-styles', 'dist-js'));


/* =================================
    Watch
================================= */

gulp.task('watch', function(cb) {
    var server = livereload();
    livereload.listen();
    gulp.watch(paths.source.styles + '**/*.less', gulp.series('dist-css'));
    gulp.watch(paths.source.scripts + '**/*.*', gulp.series('dist-js'));
    cb();
});

gulp.task('connect', function(cb) {
    connect.server({
        root: [paths.root],
        port: '3003'
    });
    cb();
});

gulp.task('open', function(cb) {
    gulp.src(paths.examples.index).pipe(open('', {
        url: 'http://localhost:3003/' + paths.examples.index
    }));
    cb();
});

//gulp.task('default', gulp.series('build-dist', 'connect', 'open', 'watch'));
gulp.task('default', gulp.series('build-dist', 'connect', 'watch'));


/*---------------- release -------------------------------*/

gulp.task('mini-d6css', function(cb){
    gulp.src(paths.dist.styles + '*.css')
        .pipe(rename({
            suffix: '.min'
        }))
        //.pipe(sourcemaps.init())
        .pipe(cleanCSS({
            advanced : false, 
            aggressiveMerging : false
        }))
        //.pipe(sourcemaps.write())
        .pipe(header(banner.header, {
            date : date,
            name : 'D6'
        }))
        .pipe(gulp.dest(paths.dist.styles))
        .on('end', function(){
            cb();
        })
})

gulp.task('mini-d6js', function(cb){
    gulp.src(paths.dist.scripts + '*.js')
        .pipe(rename({
            suffix : '.min'
        }))
        //.pipe(sourcemaps.init())
        .pipe(uglify())
        //.pipe(sourcemaps.write("."))
        .pipe(header(banner.header, {
            date : date,
            name : 'D6'
        }))
        .pipe(gulp.dest(paths.dist.scripts))
        .on('end', function(){
            cb();
        })
})

gulp.task('del-mini-css-js', function(cb){
    return del([paths.dist.scripts + "*.min.js", 
        paths.dist.styles + "*.min.css"]);
})

gulp.task('release', gulp.series('del-mini-css-js', 'mini-d6js', 'mini-d6css'))

/*------------------ 主题开发处理 ------------------------------*/

gulp.task('watch-themes', function(cb) {
    var server = livereload();
    livereload.listen();
    gulp.watch(paths.source.styles + 'd6-themes.less', gulp.series('dist-css-themes'))
    cb();
});
gulp.task('dist-css-themes', function(cb){
    gulp.src('src/less/d6-themes.less')
        .pipe(less())
        .pipe(gulp.dest(paths.dist.styles))
        .pipe(livereload())
        .on('end', function(){
            cb();
        })
})
gulp.task('build-css', gulp.series('dist-css-themes', 'connect', 'watch-themes'));