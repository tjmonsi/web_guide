$.widget("confapp.slotBubbles", {
	options: {
		session: false,
		userData: false,
		annotationImageDirectory: false,
		mapImageDirectory: false,
		imageDirectory: false
	},

	_create: function() {
		this.slotBubbleBody = $("<tbody />").appendTo(this.element);
		this.slotBubbleRow = $("<tr />").appendTo(this.slotBubbleBody);

		this._updateBubbles();
		this._addClasses();
		this._addTooltips();
	},

	_destroy: function() {
		this._clearEventListenerss();
		this._destroyTooltips();
		this._clearBubbles();
	},

	_addClasses: function() {
		this.element.addClass("slot_bubbles");
	},

	_updateBubbles: function() {
		var presentationPercentages = this._getPresentationPercentages(),
			percentageSum = 0;

		this._clearBubbles();
		$.each(presentationPercentages, $.proxy(function(index, info) {
			var percent = info.percent;
			$("<td />")	.appendTo(this.slotBubbleRow)
						.slotBubble({
							presentation: info.presentation,
							percent: percent,
							userData: this.option("userData"),
							annotationImageDirectory: this.option('annotationImageDirectory'),
							mapImageDirectory: this.option('mapImageDirectory'),
							imageDirectory: this.option('imageDirectory')
						});
			percentageSum += percent;
		}, this));

		if(percentageSum < 0.99) {
			$('<td />').appendTo(this.slotBubbleRow)
						.css({
							width: (100*(1-percentageSum)) + "%"
						});
		}
	},

	_clearBubbles: function() {
		$.each(this.slotBubbleRow.children(), function(index, child) {
			child.slotBubble("destroy").remove();
		});
	},

	_getPresentationPercentages: function() {
		var session = this.option("session"),
			presentations = session.getSubEvents(),
			sessionDuration = session.getEndTimestamp() - session.getStartTimestamp(),
			percentages = $.map(presentations, function(presentation) {
				var presentationDuration = presentation.getEndTimestamp() - presentation.getStartTimestamp();
				return {	presentation: presentation,
							percent: presentationDuration/sessionDuration
						};
			});

		var totalPercentage = 0;
		$.each(percentages, function(index, pinfo) {
			totalPercentage += pinfo.percent;
		});
		if(totalPercentage > 1) { //normalize
			$.each(percentages, function(index, pinfo) {
				pinfo.percent = pinfo.percent / totalPercentage;
			});
		}

		return percentages;
	},

	_addTooltips: function() {
		this.slotBubbleRow.tooltip({
			position: { my: 'center bottom', at: 'center top-5' },
			items: '.slot_bubble',
			content: function () {
				return $(this).slotBubble('getTooltipContent');
			},
			show: false,
			hide: false
		});
	},
	_destroyTooltips: function() {
		this.slotBubbleRow.tooltip('destroy');
	}
});

$.widget("confapp.slotBubble", {
	options: {
		presentation: false,
		percent: false,
		userData: false,
		annotationImageDirectory: false,
		mapImageDirectory: false,
		imageDirectory: false
	},

	_create: function() {
		this._addClasses();
		this._addEventListeners();
		this._addUserDataListeners();
		this._addSearchListeners();
	},

	_destroy: function() {
		this._removeEventListeners();
		this._removeUserDataListeners();
		this._removeSearchListeners();
	},

	_addClasses: function() {
		this.element.addClass("slot_bubble")
					.css({
						width: (100*this.option("percent")) + "%",
						position: "relative",
						overflow: "hidden"
					});
	},
	_addSearchListeners: function() {
		var presentation = this.option('presentation'),
			presentationID = presentation.getID();

		$(window).on('ca_search.bubble_'+presentationID, $.proxy(function(event) {
			var eventIDs = event.eventIDs;
			if(eventIDs[presentationID]) {
				this.element.addClass('searchResult')
							.removeClass('notSearchResult');
			} else {
				this.element.addClass('notSearchResult')
							.removeClass('searchResult');
			}
		}, this)).on('ca_clear_search.bubble_'+presentationID, $.proxy(function(event){
			this.element.removeClass('notSearchResult searchResult');
		}, this));
	},
	_removeSearchListeners: function() {
		var presentation = this.option('presentation'),
			presentationID = presentation.getID();
		$(window).off('ca_search.bubble_'+presentationID).off('ca_search.bubble_'+presentationID);
	},
	_addEventListeners: function() {
		this.element.on('click.scrollToPresentation', $.proxy(function(event) {
			var presentation = this.option('presentation'),
				uniqueID = presentation.getUniqueID();

			var myEvent = jQuery.Event('slot_bubble_selected');
			myEvent.presentationUniqueID = presentation.getUniqueID();
			this.element.trigger(myEvent);

			window.location.hash = uniqueID;

			event.preventDefault();
			event.stopPropagation();
		}, this));
	},
	_removeEventListeners: function() {
		this.element.off('click.scrollToPresentation');
	},

	_addUserDataListeners: function() {
		var userData = this.option("userData"),
			presentation = this.option("presentation"),
			presentation_id = presentation.getUniqueID(),
			classes = [],
			annotations = presentation.getAnnotations();

		$.each(dataRowFields, function(index, field) {
			if(userData.getField(presentation_id, field)) {
				classes.push(field);
			}
		});

		this.element.addClass(classes.join(" "));

		userData.onChange(presentation_id, function(name, value) {
			if(dataRowFields.indexOf(name) >= 0) {
				if(value) {
					this.element.addClass(name);
				} else {
					this.element.removeClass(name);
				}
			}
		}, this, "bubbleChange");

		$.each(annotations, $.proxy(function(i, annotation) {
			var icon = annotation.getIcon();
			$("<img />").attr("src", annotation.getIconURL() || (this.option('annotationImageDirectory')+icon))
						.css({
							height: "20px",
							position: "absolute",
							top: "-3px"
						})
						.addClass("annotation")
						.appendTo(this.element);
		}, this));
	},
	_removeUserDataListeners: function() {
		var userData = this.option("userData");
		userData.offChange("bubbleChange");
	},
	getTooltipContent: function() {
		var presentation = this.option('presentation'),
			userData = this.option('userData'),
			lastNames = $.map(presentation.getPeople(), function(person) {
				return person.getLastName();
			}),
			lastNameStr;

		if(lastNames.length <= 2) {
			lastNameStr = lastNames.join(' & ');
		} else {
			lastNameStr = lastNames.slice(0, lastNames.length - 1).join(', ') + ', & ' + lastNames[lastNames.length-1];
		}

		var elem = $('<div />');
		$('<div />').text(presentation.getName())
					.addClass('title')
					.appendTo(elem);
		$('<div />').text(lastNameStr)
					.addClass('authors')
					.appendTo(elem);

		var tooltipUserAnnotations = $('<div />')	.appendTo(elem)
													.addClass('user_annotations');
		var tooltipAnnotations = $('<div />')	.appendTo(elem)
												.addClass('annotations');

		var userDataRow = userData.getRow(presentation.getUniqueID(), true);
		if(userDataRow) {
			each(['schedule', 'reading_list', 'vote', 'note'], function(fieldName, index) {
				var fieldValue = userDataRow.getField(fieldName);
				if(fieldValue) {
					tooltipUserAnnotations.append($('<img />').attr({
						src: this.option('imageDirectory') + fieldName + '_selected.png',
						height: '16px'
					}).addClass('userData'));
				}
			}, this);
		}


		$.each(presentation.getAnnotations(), $.proxy(function(i, annotation) {
			var annotationElement = $('<span />').appendTo(tooltipAnnotations)
													.addClass('annotation');

			var icon = annotation.getIcon();
			$("<img />").attr("src", annotation.getIconURL() || this.option('annotationImageDirectory')+icon)
						.css({
							height: "16px",
							position: "relative",
							top: "3px"
						})
						.appendTo(annotationElement);
			$("<span />")	.text(annotation.getDescription())
							.appendTo(annotationElement);
		}, this));

		return elem.html();
	}
});
