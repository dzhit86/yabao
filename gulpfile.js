let project_folder = "dist";
let source_folder = "#src";

let fs = require("fs");


let path = {
    build: {
        html: project_folder + "/",
        css: project_folder + "/css/",
        js: project_folder + "/js/",
        img: project_folder + "/img/",
        //fonts: project_folder + "/fonts/",
    },
    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        css: source_folder + "/scss/style.scss",
        js: source_folder + "/js/script.js",
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
        //fonts: source_folder + "/fonts/**/*.ttf",
    },
    watch: {
        html: source_folder + "/**/*.html",
        css: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
    },
    clean: ["./" + project_folder + "/img", "./" + project_folder + "/css", "./" + project_folder + "/js", "./" + project_folder + "/*.html"],
    cleanFonts: "./" + project_folder + "/fonts/**/*",
    cleanIcons: "./" + project_folder + "/icons/**/*",
}

let {src, dest} = require("gulp"),
    gulp = require("gulp"),
    browsersync = require("browser-sync").create(),
    fileinclude = require("gulp-file-include"),
    del = require("del"),
    scss = require('gulp-sass')(require('sass')),
    autoprefixer = require("gulp-autoprefixer"),
    group_media = require("gulp-group-css-media-queries"),
    clean_css = require("gulp-clean-css"),
    rename = require("gulp-rename"),
    uglify = require("gulp-uglify-es").default,
    // imagemin = require("gulp-imagemin"),
    webp = require("gulp-webp"),
    webp_html = require("gulp-webp-html"),
    webp_css = require("gulp-webpcss"),
    svgSprite = require("gulp-svg-sprite"),
    svgmin = require("gulp-svgmin"),
    cheerio = require("gulp-cheerio"),
    replace = require("gulp-replace");
    // ttf2woff = require("gulp-ttf2woff"),
    // ttf2woff2 = require("gulp-ttf2woff2"),
    // fonter = require("gulp-fonter");

function browserSync() {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/"
        },
        port: 3000,
        notify: false
    })
}
function html() {
    return src(path.src.html)
        .pipe(fileinclude())
        //.pipe(webp_html())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream());
}
function images() {
    return src(path.src.img)
        // .pipe(webp({
        //     quality: 70
        // }))
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        // .pipe(imagemin({
        //     progressive: true,
        //     svgoPlugins: [{removeViewBox: false}],
        //     interlaced: true,
        //     optimizationLevel: 3 // 0 to 7
        // }))
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream());
}
function js() {
    return src(path.src.js)
        .pipe(fileinclude({
            prefix: '//@@',
        }))
        .pipe(dest(path.build.js))
        .pipe(uglify())
        .pipe(
            rename({
                extname: ".min.js"
            })
        )
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream());
}
function css() {
    return src(path.src.css)
        .pipe(
            scss({
                outputStyle: "expanded"
            })
        )
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 5 versions"],
                cascade: true
            })
        )
        .pipe(webp_css({
            webpClass: '.webp',
            noWebpClass: '.no-webp'
        }))
        .pipe(group_media())
        .pipe(dest(path.build.css))
        .pipe(clean_css())
        .pipe(
            rename({
                extname: ".min.css"
            })
        )
        .pipe(dest(path.build.css))
        .pipe(browsersync.stream());
}
function watchFiles() {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}
function clean() {
    return del(path.clean);
}
function fontsStyle() {
    let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
    if (file_content == '') {
        fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
                    }
                    c_fontname = fontname;
                }
            }
        })
    }
}
function cb() { }

gulp.task("fonts", function () {
    del(path.cleanFonts);
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts));
    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts));
});
gulp.task("otf2ttf", function (){
    return src(source_folder + "/fonts/*.otf")
        .pipe(fonter({
            formats: ["ttf"]
        }))
        .pipe(dest(source_folder + "/fonts/"));
});
gulp.task("svgspr", function (){
    del(path.cleanIcons);
    return gulp.src(source_folder + "/iconsprite/*.svg")
        // minify svg
        .pipe(svgmin({
            js2svg: {
                pretty: true
            }
        }))
        // remove all fill, style and stroke declarations in out shapes
        .pipe(cheerio({
            run: function ($) {
                //$('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: {xmlMode: true}
        }))
        // cheerio plugin create unnecessary string '&gt;', so replace it.
        .pipe(replace('&gt;', '>'))
        // build svg sprite
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../../icons/sprite.svg",
                }
            }

        }))
        .pipe(dest(path.build.img));
});

//let build = gulp.series(clean, gulp.parallel(css, js, html, images), fontsStyle);
let build = gulp.series(clean, gulp.parallel(css, js, html, images));
let watch = gulp.parallel(build, watchFiles, browserSync);


//exports.fontsStyle = fontsStyle;
exports.images = images;
exports.css = css;
exports.js = js;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;