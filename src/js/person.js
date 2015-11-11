$.widget("confapp.authorList", {
	options: {
		event: false,
		expanded: false,
		numColumns: 4,
		gridColumns: 12,
	},

	_create: function() {
		this._addClasses();
		this._updatePeople();
	},

	_destroy: function() {
		this._clearPeople();
	},

	_updatePeople: function() {
		var event = this.option("event"),
			people = event.getPeople(),
			numPeople = event.length,
			numColumns = this.option("numColumns"),
			gridColumns = this.option("gridColumns"),
			columnClass = numbers[Math.round(gridColumns/numColumns)-1],
			row = [],
			rows = [row];

		$.each(people, function(index, person) {
			if(row.length >= numColumns) {
				row = [];
				rows.push(row);
			}
			row.push(person);
		});

		this._clearPeople();
		$.each(rows, $.proxy(function(i, row) {
			var rowElement = $("<div />")	.addClass("row")
											.appendTo(this.element);

			$.each(row, $.proxy(function(j, person) {
				$("<div />")	.appendTo(rowElement)
								.person({
									person: person,
									columnClass: columnClass
								});
			}, this));
		}, this));
	},

	_clearPeople: function() {
		$.each(this.element.children(), function(i, row) {
			$.each($(row).children(), function(j, child) {
				$(child).person("destroy").remove();
			});
		});
	},

	_addClasses: function() {
		this.element.addClass("authorList");
	},
});

$.widget("confapp.person", {
	options: {
		person: false,
		columnClass: false,
		inline: false,
		prefix: ''
	},

	_create: function() {
		var person = this.option("person"),
			inline = this.option('inline'),
			affiliation = person.getAffiliation();

		var tag_type = inline ? '<span />' : '<div />';

		if(inline) {
			var prefix = this.option('prefix');

			this.element.text(prefix);
		}

		this.nameElement = $(tag_type)	.appendTo(this.element)
										.text(person.getName());

		if(inline) {
			var affiliationText = affiliation ? ' (' + affiliation + ')' : '';
			this.affiliationElement = $(tag_type)	.appendTo(this.element)
													.text(affiliationText);
		} else {
			this.affiliationElement = $(tag_type)	.appendTo(this.element)
													.text(affiliation);
		}
		this.nameElement.on('click', function() {
			$('.ca_search').search('setSearchQuery', person.getName());
		});
		this.affiliationElement.on('click', function() {
			$('.ca_search').search('setSearchQuery', person.getAffiliation());
		});
		this._addClasses();
	},

	_destroy: function() {
	},

	_setOption: function( key, value ) {
		this._super(key, value);
	},

	_addClasses: function() {
		this.element.addClass("person columns")
					.addClass(this.option("columnClass"));
		this.nameElement.addClass("name");
		this.affiliationElement.addClass("affiliation");
	},
});
