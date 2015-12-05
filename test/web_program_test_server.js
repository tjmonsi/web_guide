var express = require('express'),
	path = require('path'),
	sassMiddleware = require('node-sass-middleware');

var rootPath = path.resolve(__dirname, '..');

var app = express().use(sassMiddleware({
			    src: rootPath,
			    //dest: path.join(__dirname, 'public'),
			    debug: true,
			    //outputStyle: 'compressed',
			    //prefix:  '/prefix'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
			    prefix: '../src/css/'
			}))
			.use(express.static(rootPath))
			.use(express.static(path.join(rootPath, 'src')))
			.listen(8888, function() {
				console.log('started server');
			});
