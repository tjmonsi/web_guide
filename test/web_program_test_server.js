var express = require('express'),
	path = require('path'),
	sassMiddleware = require('node-sass-middleware');

var app = express().use(sassMiddleware({
			    src: path.join(__dirname),
			    //dest: path.join(__dirname, 'public'),
			    //debug: true,
			    //outputStyle: 'compressed',
			    //prefix:  '/prefix'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
			    prefix: 'src/css'
			}))
			.use(express.static(__dirname))
			.use(express.static(path.join(__dirname, 'src')))
			.listen(8888, function() {
				console.log('started server');
			});
