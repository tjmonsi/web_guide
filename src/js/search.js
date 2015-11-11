/*jshint scripturl:true*/
var caSearchQuery = (function() {
	var currentSearchQuery;
	return function(val) {
		if(arguments.length >= 1) {
			currentSearchQuery = val;
		} else {
			return currentSearchQuery;
		}
	};
}());
$.widget("confapp.search", {
	options: {
		database: false,
		userData: false,
		minQueryLength: 3
	},

	_create: function() {
		var database = this.option('database');
		database.onLoad(function() {
			this.inputLabel = $('<label />').appendTo(this.element)
											.attr({
												for: 'ca_searchbox'
											})
											.text('Search: ');

			this.input = $('<input />').appendTo(this.element)
										.attr({
											placeholder: 'title, person, school, or description',
											id: 'ca_searchbox',
											name: 'ca_searchbox'
										})
										.on('input.updatesearch', throttle(this._onInput, 200, this))
										.on('focus', $.proxy(function() {
											this.input.select();
										}, this));
			this.clear = $('<a />').appendTo(this.element)
									.addClass('clearSearch')
									.text('clear')
									.attr({
										href: 'javascript:void(0)'
									})
									.on('click', $.proxy(function() {
										this.setSearchQuery('');
									}, this));
			this.autoComplete = $('<div />').appendTo(this.element);

			this.input.catcomplete({
				appendTo: this.autocomplete,
				select: $.proxy(function(event, ui) {
					this.setSearchQuery(ui.item.value);
					event.preventDefault();
				}, this),
			    source: $.proxy(function(request, response) {
					var rv = [];
					var filter = this._results || {};
					if(filter.affiliations) {
						$.each(filter.affiliations, function(i, affiliation) {
							rv.push({label: affiliation.institute, category: 'Affiliations'});
						});
					}

					if(filter.people) {
						$.each(filter.people, function(i, person) {
							rv.push({label: person.getName(), category: 'People'});
						});
					}

					if(filter.sessions) {
						$.each(filter.sessions, function(i, session) {
							rv.push({label: session.getName(), category: 'Sessions'});
						});
					}

					if(filter.papers) {
						$.each(filter.papers, function(i, session) {
							rv.push({label: session.getName(), category: 'Presentations'});
						});
					}
					response(rv);
			  }, this)
		  });
		}, this);
		this.element.addClass('ca_search');
	},

	_destroy: function() {
		this.input.off('input.updatesearch').remove();
	},

	setSearchQuery: function(query) {
		this.input.val(query);
		this._onInput();
	},

	_updateAutocomplete: function(results) {
		this.input.catcomplete('search');
	},

	_onInput: function(event) { this._updateQuery(this.input.val().trim()); },

	_updateQuery: function(searchQuery) {
		var myEvent;
		var minQueryLength = this.option('minQueryLength');

		if(searchQuery && (!minQueryLength || searchQuery.length >= minQueryLength)) {
			var database = this.option('database'),
				results = database.doSearch(searchQuery),
				events = this._getEvents(results);

			this._results = results;

			this._updateAutocomplete(results);

			myEvent = jQuery.Event('ca_search');
			myEvent.query = searchQuery;
			myEvent.eventIDs = events;

			this.element.trigger(myEvent);
			this.element.addClass('sticky');
			caSearchQuery(myEvent);
			scrollTo('.searchResult', -50);
		} else {
			this._updateAutocomplete(false);

			myEvent = jQuery.Event('ca_clear_search');
			this.element.trigger(myEvent);
			this.element.removeClass('sticky');
			caSearchQuery(myEvent);
		}
	},

	_getEvents: function(filter) {
		var database = this.option('database');

		var relevantEvents = {},
			relevantPeople = {},
			rv = {};

		if(filter.affiliations) {
			$.each(filter.affiliations, function(i, affiliation) {
				$.each(database.getPeopleWithAffiliation(affiliation.institute), function(i, person) {
					relevantPeople[person.getID()] = person;
				});
			});
		}

		if(filter.people) {
			$.each(filter.people, function(i, person) {
				relevantPeople[person.getID()] = person;
			});
		}

		if(filter.sessions) {
			$.each(filter.sessions, function(i, event) {
				relevantEvents[event.getID()] = event;
			});
		}

		if(filter.papers) {
			$.each(filter.papers, function(i, event) {
				relevantEvents[event.getID()] = event;
			});
		}

		// push from people to papers to sessions

		$.each(relevantPeople, function(id, person) {
			var personEvents = person.getEvents();
			$.each(personEvents, function(i, event) {
				relevantEvents[event.getID()] = event;
			});
		});
		$.each(relevantEvents, function(id, event) {
			var parent = event.getParent();
			if(parent) {
				relevantEvents[parent.getID()] = parent;
			}
		});

		$.each(relevantEvents, function(id) {
			relevantEvents[id] = true;
		});

		return relevantEvents;
	},
});

$.widget("confapp.autoCompleteResult", {
	options: {
		name: '',
		type: '',
		query: ''
	},
	_create: function() {
		var nameElement = $('<div />')	.addClass('result_name')
										.appendTo(this.element)
										.text(this.option('name'));

		var typeElement = $('<div />')	.addClass('result_type')
										.appendTo(this.element)
										.text('('+this.option('type')+')');

		this.element.on('click.enterAutoComplete', $.proxy(function() {
			var myEvent = jQuery.Event('autocomplete_selected');
			myEvent.query = this.option('query');

			this.element.trigger(myEvent);
		}, this));
	},

	_destroy: function() {
		this.element.off('click.enterAutoComplete');
	}
});

$.widget( "custom.catcomplete", $.ui.autocomplete, {
	_create: function() {
		this._super();
		this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)" );
	},
	_renderMenu: function( ul, items ) {
		var that = this,
		currentCategory = "";
		$.each( items, function( index, item ) {
			var li;
			if (item.category !== currentCategory) {
				ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
				currentCategory = item.category;
			}
			li = that._renderItemData( ul, item );
			if (item.category) {
				li.attr( "aria-label", item.category + " : " + item.label );
			}
		});
	}
});
