var fs = require('fs'),
	path = require('path');
module.exports = function(grunt) {
	var DB_CREATOR_FOLDER = require('./db_creator_server/constants').DB_CREATOR_FOLDER,
		UPLOAD_DIR = require('./db_creator_server/constants').UPLOAD_DIR,
		SUB_DIRS = require('./db_creator_server/constants').SUB_DIRS,
		_ = require('underscore');

	var src_files = [
					"web_program/src/js/db_query.js", "web_program/src/js/core.js", "web_program/src/js/day.js",
					"web_program/src/js/person.js", "web_program/src/js/slot_bubbles.js",
					"web_program/src/js/time_slot.js", "web_program/src/js/session.js", "web_program/src/js/presentation.js",
					"web_program/web_program/src/js/person.js", "web_program/src/js/location.js", "web_program/src/js/session.js",
					"web_program/src/js/user_data.js", "web_program/src/js/user_data_view.js", "web_program/src/js/search.js"
					],
		enclosed_src_files = (["web_program/src/vendor/jquery-ui.js", "web_program/src/js/header.js"]).concat(src_files, "web_program/src/js/footer.js");

	grunt.initConfig({
		jshint: {
			source: {
				src: src_files
			},
			post_concat: {
				src: "web_program/build/confapp.js"
			}
		},
		uglify: {
			development: {
				options: {
					report: 'gzip',
					sourceMapIn: "web_program/build/confapp.js.map",
					sourceMap: "web_program/build/confapp.min.js.map",
					sourceMappingURL: "web_program/confapp.min.js.map",
					sourceMapPrefix: 1
				},
				src: "web_program/build/js/confapp.js", // Use concatenated files
				dest: "web_program/build/js/confapp.min.js"
			},
			production: {
				options: {
					sourceMap: "web_program/build/confapp.min.js.map",
					sourceMappingURL: "confapp.min.js.map",
					sourceMapPrefix: 1
				},
				src: "web_program/build/js/confapp.js", // Use concatenated files
				dest: "web_program/build/js/confapp.min.js"
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
				dest: "web_program/build/js/confapp.js"
			}
		},
		concat: {
			js: {
				options: {
					stripBanners: true,
				},
				src: enclosed_src_files,
				dest: "web_program/build/js/confapp.js"
			},
			css: {
				src: ['web_program/src/vendor/Skeleton-2.0.4/css/skeleton.css', 'web_program/src/css/confapp_style.css'],
				dest: "web_program/build/css/confapp.css"
			}
		},
		qunit: {
			files: ['test/unit_tests.html']
		},
		clean: {
			build: ["web_program/build/"]
		},
		cssmin : {
			compress : {
				files : {
					"web_program/build/css/confapp.min.css": ['web_program/src/vendor/Skeleton-2.0.4/css/skeleton.css', 'web_program/src/css/confapp_style.css']
				}
			}
		},
		copy: {
			main: {
				options: {
					process: function(content, srcpath) {
						return content.replace("INSERT DB FILENAME HERE", grunt.option("web_program_db_filename"));
					}
				},
				files: [
					{
						src: ["web_program/src/index.html"],
						dest: "web_program/build/index.html"
					}, {
						src: ["**"],
						cwd: "web_program/src/images/",
						dest: "web_program/build/images/",
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
			web_program: {
				options: {
					archive: '<%=compress_output%>'
				},
				files: [
					{
						src: ['*', '*/*'],
						cwd: 'web_program/build/',
						dest: 'program_and_db',
						expand: true
					}, {
						src: ['*'],
						cwd: 'web_program/src/images',
						dest: 'program_and_db/images',
						expand: true
					}, {
						src: ["<%=sqlite_filename%>","<%=json_filename%>","<%=jsonp_filename%>"],
						cwd: "<%=database_path%>",
						dest: "program_and_db/database/",
						expand: true,
					}, {
						src: "*",
						cwd: "<%=icons_folder%>",
						dest: "program_and_db/images/annotations/",
						expand: true,
					}, {
						src: "*",
						cwd: "<%=app_icons_folder%>",
						dest: "program_and_db/images/conference/",
						expand: true,
					}, {
						src: "*",
						cwd: "<%=maps_folder%>",
						dest: "program_and_db/images/maps/",
						expand: true,
					}
				]
			},
			database: {
				options: {
					archive: '<%=compress_output%>'
				},
				files: [
					{
						src: ["<%=sqlite_filename%>","<%=json_filename%>","<%=jsonp_filename%>"],
						cwd: "<%=database_path%>",
						dest: "database/",
						expand: true,
					}
				]
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
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-concat-sourcemap');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-sass');

	// Default task(s).
	grunt.registerTask('default', ['clean', 'jshint:source', 'sass', 'concat', 'uglify:production', 'cssmin', 'copy']);

	grunt.registerTask('buildProgramDownload', "Build and zip data files and Web guide for download", function() {
		var db_info = grunt.option("db_info"),
			conference_uid = grunt.option("conference_uid"),
			conference_path = path.join(DB_CREATOR_FOLDER, UPLOAD_DIR, conference_uid),
			database_path = path.join(conference_path, SUB_DIRS.DATABASES);
			output_path = path.join(conference_path, SUB_DIRS.BUILDS);

		_.each(["sqlite_filename", "json_filename", "jsonp_filename"], function(type) {
			//console.log(database_path);
			//console.log(type, db_info[type], path.relative(database_path, db_info[type]));
			grunt.config(type, path.relative(database_path, db_info[type]));
		});
		grunt.config("maps_folder", path.join(conference_path, SUB_DIRS.MAPS));
		grunt.config("icons_folder", path.join(conference_path, SUB_DIRS.ICONS));
		grunt.config("app_icons_folder", path.join(conference_path, SUB_DIRS.APPICONS));
		grunt.config("database_path", database_path);
		grunt.config("compress_output", grunt.option("filename"));
		grunt.option("web_program_db_filename", path.join("database", path.basename(db_info.json_filename)));
		grunt.task.run(['default', 'compress:web_program']);
	});

	grunt.registerTask('buildDatabaseDownload', "Build and zip data files (only) files for download", function() {
		var db_info = grunt.option("db_info"),
			conference_uid = grunt.option("conference_uid"),
			conference_path = path.join(DB_CREATOR_FOLDER, UPLOAD_DIR, conference_uid),
			database_path = path.join(conference_path, SUB_DIRS.DATABASES),
			output_path = path.join(conference_path, SUB_DIRS.BUILDS);

		_.each(["sqlite_filename", "json_filename", "jsonp_filename"], function(type) {
			//console.log(database_path);
			//console.log(type, db_info[type], path.relative(database_path, db_info[type]));
			grunt.config(type, path.relative(database_path, db_info[type]));
		});

		grunt.config("maps_folder", path.join(conference_path, SUB_DIRS.MAPS));
		grunt.config("icons_folder", path.join(conference_path, SUB_DIRS.ICONS));
		grunt.config("database_path", database_path);
		grunt.option("web_program_db_filename", path.join("database", path.basename(db_info.json_filename)));
		grunt.config("compress_output", grunt.option("filename"));
		grunt.task.run(['compress:database']);
	});
};

function copy(fromFilename, toFilename, cb) {
	return new Promise(function(resolve, reject) {
		var cbCalled = false,
			rd = fs.createReadStream(fromFilename);

		rd.on("error", function(err) {
			reject(err);
		});

		var wr = fs.createWriteStream(toFilename);
		wr.on("error", function(err) {
			reject(err);
		});
		wr.on("close", function(ex) {
			resolve();
		});
		rd.pipe(wr);
	});
}
