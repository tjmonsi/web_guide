function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
		sURLVariables = sPageURL.split('&'),
		i = 0,
		len = sURLVariables.length,
		sParameterName;

    for (; i < len; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1];
        }
    }
}

var paper = getUrlParameter("paper");

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
}

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

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
