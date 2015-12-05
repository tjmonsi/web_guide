$.widget("confapp.caWebProgram", {
	options: {
		databaseURL: false,
		selectedEvent: window.location.hash,
		saveOnUnload: true,
		showLogo: false,
		annotationImageDirectory: 'images/annotations',
		mapImageDirectory: 'images/maps',
		imageDirectory: 'images',
		conferenceLogo: false,
		firebaseRef: new Firebase("https://confapp-data-sync.firebaseio.com")
	},

	_create: function() {
		this._loadDatabase(this.option("databaseURL"));

		this.loadingElement = $("<div />")	.appendTo(this.element)
											.text("Loading...");

		this.logoElement = $('<span />').appendTo(this.headerElement);

		this.headerElement = $('<div />').appendTo(this.element)
											.addClass('program_header');

		this.signinElement = $("<span />")	.appendTo(this.headerElement)
											.on("googleLogin", $.proxy(this._onGoogleLogin, this))
											.google_signin({
												database: this.getDatabase(),
												firebaseRef: this.option('firebaseRef')
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

		this._user_data = new UserData(this.option('firebaseRef'), database.getID(), conference_info.data_sync);

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
