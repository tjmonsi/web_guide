var fs = require('fs'),
	path = require('path'),
	_ = require('underscore');

var SRC = 'src',
	BUILD = 'build',
	TEST = 'test',
	DB_QUERY = 'javascript_db_query';

function mapJoin() {
	var arr = _.last(arguments),
		path_fields = _.first(arguments, arguments.length-1);
	return _.map(arr, function(filename) {
		return path.join.apply(path, path_fields.concat(filename));
	});
}

module.exports = function(grunt) {
	var src_files = mapJoin(DB_QUERY, ['confapp_db_query.js', 'fetch_latest_db.js']).concat(mapJoin(SRC, 'js', [
						"utils.js", "core.js", "day.js",
						"person.js", "slot_bubbles.js",
						"time_slot.js", "session.js", "presentation.js",
						"person.js", "location.js", "user_data.js", "user_data_view.js", "search.js"
					])),
		enclosed_src_files = ([path.join(SRC, 'vendor', 'jquery-ui.js'),
								path.join(SRC, 'vendor', 'moment-with-locales.js'),
								path.join(SRC, 'vendor', 'firebase.js'),
								path.join(SRC, 'vendor', 'store.js-1.3.20', 'store.js'),
								path.join(SRC, 'js', 'header.js')]).concat(src_files, path.join(SRC, 'js', 'footer.js'));

	grunt.initConfig({
		jshint: {
			source: {
				src: src_files
			},
			post_concat: {
				src: path.join(BUILD, 'confapp.js')
			}
		},
		uglify: {
			development: {
				options: {
					report: 'gzip',
					sourceMapIn: path.join(BUILD, 'confapp.js.map'),
					sourceMap: path.join(BUILD, 'confapp.min.js.map'),
					sourceMappingURL: 'confapp.min.js.map',
					sourceMapPrefix: 1
				},
				src: path.join(BUILD, 'js', 'confapp.js'), // Use concatenated files
				dest: path.join(BUILD, 'js', 'confapp.min.js')
			},
			production: {
				options: {
					sourceMap: path.join(BUILD, 'confapp.min.js.map'),
					sourceMappingURL: 'confapp.min.js.map',
					sourceMapPrefix: 1
				},
				src: path.join(BUILD, 'js', 'confapp.js'), // Use concatenated files
				dest: path.join(BUILD, 'js', 'confapp.min.js')
			}
		},
		concat_sourcemap: {
			options: {
				process: {
					data: {
					}
				},
				sourceRoot: '..'
			},
			js: {
				src: enclosed_src_files,
				dest: path.join(BUILD, 'js', 'confapp.js')
			}
		},
		concat: {
			js: {
				options: {
					stripBanners: true,
				},
				src: enclosed_src_files,
				dest: path.join(BUILD, 'js', 'confapp.js')
			},
			css: {
				src: [path.join(SRC, 'vendor', 'Skeleton-2.0.4', 'css', 'skeleton.css'),
						path.join(SRC, 'css', 'confapp_style.css')],
				dest: path.join(BUILD, 'css', 'confapp.css')
			}
		},
		qunit: {
			files: [path.join(TEST, 'unit_tests.html')]
		},
		clean: {
			build: [BUILD]
		},
		cssmin : {
			compress : {
				files : {
					'build/css/confapp.min.css': [path.join(SRC, 'vendor', 'Skeleton-2.0.4', 'css', 'skeleton.css'),
													path.join(SRC, 'css', 'confapp_style.css')]
				}
			}
		},
		copy: {
			main: {
				options: {
					noProcess: [
						'**/*.{png,gif,jpg,ico,psd,ttf,otf,woff,svg}'
					],
					//process: function(content, srcpath) {
						//return content.replace("INSERT DB FILENAME HERE", grunt.option("web_program_db_filename"));
					//}
				},
				files: [
					{
						src: [path.join(SRC, 'index.html')],
						dest: path.join(BUILD, 'index.html')
					}, {
						src: ["**"],
						cwd: path.join(SRC, 'images'),
						dest: path.join(BUILD, 'images'),
						expand: true
					}
				]
			}
		},
		sass: {
			options: {
				sourceMap: true
			},
			dist: {
				files: {
					'web_program/src/css/confapp_style.css': 'web_program/src/css/confapp_style.scss'
				}
			}
		},
		compress: {
			main: {
				options: {
					mode: 'zip',
					archive: 'confapp_web_guide.zip'
				},
				expand: true,
				cwd: 'build',
				src: ['**'],
				dest: ''
			}
		}
	});

	grunt.registerTask('usetheforce_on', 'force the force option on if needed',
		function() {
			if (!grunt.option('force')) {
				grunt.config.set('usetheforce_set', true);
				grunt.option( 'force', true );
			}
		});
	grunt.registerTask('usetheforce_restore', 'turn force option off if we have previously set it',
			function() {
			if (grunt.config.get('usetheforce_set')) {
				grunt.option( 'force', false );
			}
		});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-concat-sourcemap');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-sass');

	// Default task(s).
	grunt.registerTask('default', ['clean', 'jshint:source', 'sass', 'concat', 'uglify:production', 'cssmin', 'copy']);
	grunt.registerTask('package', ['default', 'compress']);
};
