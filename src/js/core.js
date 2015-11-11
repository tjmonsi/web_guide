$.widget("confapp.caWebProgram", {
	options: {
		databaseURL: false,
		selectedEvent: window.location.hash,
		saveOnUnload: true,
		showLogo: false,
		annotationImageDirectory: 'images/annotations',
		mapImageDirectory: 'images/maps',
		imageDirectory: 'images'
	},

	_create: function() {
		this._loadDatabase(this.option("databaseURL"));

		this.loadingElement = $("<div />")	.appendTo(this.element)
											.text("Loading...");

		this.headerElement = $('<div />').appendTo(this.element)
											.addClass('program_header');

		this.signinElement = $("<span />")	.appendTo(this.headerElement)
											.on("googleLogin", $.proxy(this._onGoogleLogin, this))
											.google_signin({
												database: this.getDatabase()
											});

		this.daysElement = $("<div />")	.appendTo(this.element)
										.addClass("conference_days");

	},

	_destroy: function() {
		this._clearDays();
		this.daysElement.remove();
	},

	_loadDatabase: function(url) {
		this._database = confApp.loadDatabase(url, this._onDatabaseLoaded, this);
	},

	_onDatabaseLoaded: function() {
		var database = this.getDatabase(),
			conference_info = database.getConferenceInfo();

		document.title = [conference_info.name, 'Program'].join(' ');

		this.loadingElement.remove();

		this._user_data = new UserData(conference_info.data_url, database.getID(), conference_info.data_sync);

		if(this.option("saveOnUnload")) {
			$(window).on("beforeunload", $.proxy(function() {
				this._user_data.saveLocally();
			}, this));
		}
		//setInterval($.proxy(function() {
			//this._user_data.webSync();
		//}, this), 5000);
		this._updateDays();

		var selectedEvent = this.option('selectedEvent');
		if(selectedEvent) {
			selectedEvent = selectedEvent.replace('#', '');
			var presentation = database.getEventWithUniqueID(selectedEvent);
			if(presentation) {
				this.openPresentation(presentation);
			}
		}
	},

	openPresentation: function(presentation) {
		var parent = presentation.getParent(),
			presentationElement;
		if(parent) {
			var parentElement = $('#' + parent.getUniqueID(), this.element);
			parentElement.session('expand');
			presentationElement = $('#' + presentation.getUniqueID(), this.element);
			scrollTo(presentationElement);
		} else {
			presentationElement = $('#' + presentation.getUniqueID(), this.element);
			scrollTo(presentationElement);
		}

		presentationElement.addClass('searchResult');
		setTimeout(function() {
			presentationElement.removeClass('searchResult');
		}, 5000);
	},

	_updateDays: function() {
		var database = this.getDatabase(),
			dayTimestamps = database.getDayTimestamps();

		this._clearDays();

		if(this.option('showLogo')) {
		}

		this.voterIDElement = $('<span />').appendTo(this.headerElement)
											.viewVoterID({
												userData: this.getUserData(),
												database: database
											});

		this.searchElement = $('<div />').appendTo(this.headerElement)
											.search({
												database: database,
												userData: this.getUserData()
											});

		if(dayTimestamps) {
			each(dayTimestamps, function(dayTimestamp, index) {
				$("<div />").appendTo(this.daysElement)
							.caDay({
								database: database,
								userData: this.getUserData(),
								dayTimestamp: dayTimestamp,
								annotationImageDirectory: addTrailingSlash(this.option('annotationImageDirectory')),
								mapImageDirectory: addTrailingSlash(this.option('mapImageDirectory')),
								imageDirectory: addTrailingSlash(this.option('imageDirectory'))
							});
			}, this);
		} else { // we have data that doesn't have any times set yet. just display everything
			$("<div />").appendTo(this.daysElement)
						.caDay({
							database: database,
							userData: this.getUserData(),
							selectedEvent: this.option("selectedEvent"),
							dayTimestamp: false,
							annotationImageDirectory: addTrailingSlash(this.option('annotationImageDirectory')),
							mapImageDirectory: addTrailingSlash(this.option('mapImageDirectory')),
							imageDirectory: addTrailingSlash(this.option('imageDirectory'))
						});
		}
	},

	_clearDays: function() {
		$.each(this.daysElement.children(), function(index, child) {
			child.caDay("destroy").remove();
		});
	},

	_onGoogleLogin: function(event) {
		var profile = event.profile,
			id_token = event.id_token;

		this._user_data.setGoogleIDToken(id_token);
	},

	getDatabase: function() {
		return this._database;
	},
	getUserData: function() {
		return this._user_data;
	}
});

// http://stackoverflow.com/questions/11531363/javascript-jquery-add-trailing-slash-to-url-if-not-present
function addTrailingSlash(url) {
	var lastChar = url.substr(-1); // Selects the last character
	return (lastChar === '/') ? url : (url + '/');
}

function getLongWeekdayName(date) {
	return moment(date).format('dddd');
}
function getShortWeekdayName(date) {
	return moment(date).format('ddd');
}
var numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
function spellOutNum(num) {
	return numbers[num-1];
}
function scrollTo(element, offset) {
	if(!offset) { offset = 0; }
	var elementOffset = $(element).offset(),
		scrollTop;
	if(elementOffset) {
		scrollTop = elementOffset.top + offset;
	} else {
		scrollTop = offset;
	}

	$('html, body').animate({
		scrollTop: scrollTop
	}, 400);
}

function throttle(fn, threshold, thisArg) {
	threshold = threshold || 100;
	thisArg = thisArg || this;
	var last, deferTimer;

	return function() {
		var args = arguments,
			now = new Date().getTime();

		if(last && now < last + threshold) {
			clearTimeout(deferTimer);
			deferTimer = setTimeout(function() {
				last = now;
				fn.apply(thisArg, args);
			}, threshold);
		} else {
			last = now;
			fn.apply(thisArg, args);
		}
	};
}
var DO_BREAK = {};
function each(obj, fn, thisArg) {
	if(!obj) { return; }
	var i, length = obj.length;
	if (length === +length) {
		for (i = 0; i < length; i++) {
			if(fn.call(thisArg, obj[i], i, obj) === DO_BREAK) {
				return;
			}
		}
	} else {
		i = 0;
		for(var key in obj) {
			if(obj.hasOwnProperty(key)) {
				if(fn.call(thisArg, obj[key], key, obj) === DO_BREAK) {
					break;
				}
			}
		}
	}
}

function filter(obj, fn, thisArg) {
	var rv = [];
	each(obj, function(val) {
		var newVal = fn.apply(thisArg, arguments);
		if(newVal) {
			rv.push(newVal);
		}
	});
	return rv;
}

function map(obj, fn, thisArg) {
	var rv = [];
	each(obj, function(val, key) {
		rv[key] = fn.apply(thisArg, arguments);
	});
	return rv;
}
/*

function preg_quote(str) {
	// http://kevin.vanzonneveld.net
	// +   original by: booeyOH
	// +   improved by: Ates Goral (http://magnetiq.com)
	// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// +   bugfixed by: Onno Marsman
	// *     example 1: preg_quote("$40");
	// *     returns 1: '\$40'
	// *     example 2: preg_quote("*RRRING* Hello?");
	// *     returns 2: '\*RRRING\* Hello\?'
	// *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
	// *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'

	return (str+'').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
}

function addHighlights(data, search, humanVarName, highlightClass) {
	var replacementElement = $('<span />').attr({
			'data-name': humanVarName
		})
		.addClass('highlight highlight'+highlightClass)
		.text(humanVarName);

	var replacementHTML = ' ' + replacementElement[0].outerHTML + ' ';

    return data.replace(new RegExp('(^|\\s)' + preg_quote(search) + '($|\\s)', 'gi'), replacementHTML);
}

*/
