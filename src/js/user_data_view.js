/*jshint scripturl:true*/
$.widget("confapp.google_signin", {
	options: {
		database: false,
		firebaseRef: false,
	},

	_create: function() {
		var database = this.option('database');
		this._signed_in = false;
		this.element.hide();
		database.onLoad(function() {
			var conferenceInfo = database.getConferenceInfo();

			if(conferenceInfo.data_sync) {
				this.element.show();
			}
		}, this);

		this._addClasses();
		this._addListeners();
	},

	_destroy: function() {
	},

	_addClasses: function() {
		this.element.addClass("ca-button google-signin");
	},

	_addListeners: function() {
		var ref = this.option('firebaseRef');
		this.element.on('click', $.proxy(this._onClick, this));
		ref.onAuth($.proxy(this._onAuth, this));

		this._onAuth(ref.getAuth());
	},
	_onAuth: function(authState) {
		if(authState) {
			var googleInfo = authState.google;
			this.element.text('Sign out from ' + googleInfo.displayName);
		} else {
			this.element.text('Sign in to sync preferences');
		}
	},
	_onClick: function() {
		if(this._isSignedIn()) {
			this._doSignout();
		} else {
			this._doSignin();
		}
	},

	_isSignedIn: function() {
		var ref = this.option('firebaseRef');
		return ref.getAuth();
	},
	_doSignin: function() {
		var ref = this.option('firebaseRef');
		ref.authWithOAuthPopup("google", $.proxy(function(error, authData) {
			if (error) {
				console.log("Login Failed!", error);
			}
		}, this));
	},
	_doSignout: function() {
		var ref = this.option('firebaseRef');
		ref.unauth()
	}
});

var inp_num = 0,
	EISTATE = { DISPLAY: "display", EDIT: "edit" };

$.widget("confapp.note", {
	options: {
		placeholder: "",
		value: "",
		editTag: "textarea",
		editType: "text",
		label: false,
		displayTag: "div",
		feedbackInterval: 3000
	},
	_create: function () {
		this._id = "input_"+inp_num;
		if(this.option("label")) {
			this.label = $("<label />").text(this.option("label"))
										.attr({
											for: this._id
										})
										.appendTo(this.element);
		}
		this.textInput = $("<" + this.option("editTag") + " />").attr({
								type: this.option("editType"),
								placeholder: this.option("placeholder"),
								id: this._id
							}).appendTo(this.element);

		this.display = $("<" + this.option("displayTag") + "/>").text(this._getDisplayValue())
									.appendTo(this.element);

		this.noteButtons = $('<div />').appendTo(this.element);
		this.feedback = $("<div />").appendTo(this.element)
									.hide();

		this.saveButton = $('<a />').attr({
							href: 'javascript:void(0)'
						})
						.text('Save')
						.on('mousedown', $.proxy(this.confirmEdit, this))
						.addClass('note_button save')
						.appendTo(this.noteButtons);

		this.cancelButton = $('<a />').attr({
							href: 'javascript:void(0)'
						})
						.text('Cancel')
						.on('mousedown', $.proxy(this.cancelEdit, this))
						.addClass('note_button cancel')
						.appendTo(this.noteButtons);

		this._doSetState(EISTATE.DISPLAY);
		this.element.addClass("editableInput");

		this.display.on("click.beginEditing", $.proxy(function() {
			this.beginEditing();
		}, this));


		this.textInput.on("keydown.endEditing", $.proxy(function(event) {
			var keyCode = event.keyCode;
			if(keyCode === 27) { // esc
				this.cancelEdit();
			}
		}, this)).on("blur.endEditing", $.proxy(function(event) {
			this.confirmEdit();
			event.preventDefault();
			event.stopPropagation();
		}, this));
		this._updateClasses();
	},
	_destroy: function() {
		this.display.off("click.beginEditing");
		this.textInput.off("keydown.endEditing blur.endEditing");
		if(this._feedback_timeout) {
			clearInterval(this._feedback_timeout);
		}
	},
	_updateClasses: function() {
		if(this._isPlaceHolder()) {
			this.element.addClass('placeholder');
		} else {
			this.element.removeClass('placeholder');
		}
	},
	_getDisplayValue: function() {
		return this._isPlaceHolder() ? this.option('placeholder') : this.option('value');
	},
	_isPlaceHolder: function() {
		return !this.option('value');
	},
	_isDisplay: function() {
		return this.state === EISTATE.DISPLAY;
	},
	_isEdit: function() {
		return this.state === EISTATE.EDIT;
	},
	_doSetState: function(state) {
		this.state = state;
		if(state === EISTATE.DISPLAY) {
			this.element.removeClass(EISTATE.EDIT);
			this.textInput.hide();
			this.noteButtons.hide();
			this.display.show();
		} else {
			this.element.removeClass(EISTATE.DISPLAY);
			this.noteButtons.show();
			this.display.hide();
			this.textInput.show();
		}
		this.element.addClass(state);
	},
	beginEditing: function() {
		if(this._isDisplay()) {
			this.initialValue = this.option("value");
			this._doSetState(EISTATE.EDIT);
			this.textInput	.val(this.option("value"))
							.focus()
							.select();
			if(this._feedback_timeout) {
				clearInterval(this._feedback_timeout);
				this.feedback.hide();
			}
		}
	},
	confirmEdit: function() {
		if(this._isEdit()) {
			var value = this.textInput.val();
			this.option("value", value);
			this._doSetState(EISTATE.DISPLAY);

			if(this.initialValue !== value) {
				var event = new $.Event("valueChange");
				event.oldValue = this.initialValue;
				event.value = value;
				this.element.trigger(event);
			}
		}
	},
	cancelEdit: function() {
		if(this._isEdit()) {
			this.option("value", this.initialValue);
			this._doSetState(EISTATE.DISPLAY);
		}
	},
	_setOption: function(key, value) {
		this._super(key, value);
		if(key === "value") {
			this.display.text(this._getDisplayValue());
			this._updateClasses();
		}
	},
	flashFeedback: function(error, success) {
		if(error) {
			this.feedback.removeClass("success").addClass("error").text(error);
		} else {
			this.feedback.removeClass("error").addClass("success").text(success);
		}
		this.feedback.show();

		var feedbackInterval = this.option("feedbackInterval");

		if(feedbackInterval) {
			this._feedback_timeout = setTimeout($.proxy(function() {
				this.feedback.hide();
				this._feedback_timeout = false;
			}, this), feedbackInterval);
		}
	}
});

$.widget("confapp.toggleButton", {
	options: {
		activated: false,
		activatedImage: false,
		deactivatedImage: false,
		activatedLabel: "",
		deactivatedLabel: "",
		height: '16px',
		checkBeforeActivating: false
	},
	_create: function() {
		this.img = $("<img />").appendTo(this.element).css({height: this.option('height')}).hide();
		this.label = $("<span />").appendTo(this.element);

		if(this.option("activated")) {
			this._doActivate();
		} else {
			this._doDeactivate();
		}
		this._addClickListeners();

		this.element.addClass("toggleButton");
	},
	_destroy: function() {
		this.img.remove();
		this.label.remove();
		this._removeClickListeners();
	},

	_addClickListeners: function() {
		this.element.on("click.toggle", $.proxy(function(event) {
			var checkBeforeActivating = this.option('checkBeforeActivating'),
				doSetValue = $.proxy(function(nowActivated) {
					if(nowActivated) {
						this.activate();
					} else {
						this.deactivate();
					}
				}, this),
				newValue = !this.isActivated();

			if(checkBeforeActivating) {
				checkBeforeActivating(newValue, doSetValue);
			} else {
				doSetValue(newValue);
			}

			event.stopPropagation();
			event.preventDefault();
		}, this));
	},

	_removeClickListeners: function() {
		this.element.off("click.toggle");
	},

	_setOption: function( key, value ) {
		this._super(key, value);
		if (key === "activated") {
			if(value) {
				this._doActivate();
			} else {
				this._doDeactivate();
			}
		}
	},

	_doActivate: function() {
		var img_src = this.option("activatedImage"),
			label_txt = this.option("activatedLabel");

		if(img_src) {
			this.img.show().attr("src", img_src);
		} else {
			this.img.hide();
		}

		this.label.text(label_txt);
		this.element.addClass("active");
	},
	_doDeactivate: function() {
		var img_src = this.option("deactivatedImage"),
			label_txt = this.option("deactivatedLabel");

		if(img_src) {
			this.img.show().attr("src", img_src);
		} else {
			this.img.hide();
		}

		this.label.text(label_txt);
		this.element.removeClass("active");
	},

	activate: function() {
		if(!this.isActivated()) {
			this.option("activated", true);

			var event = new $.Event("activated");
			this.element.trigger(event);

			var toggle_event = new $.Event("toggled");
			toggle_event.activated = this.isActivated();
			this.element.trigger(toggle_event);
		}
	},
	deactivate: function() {
		if(this.isActivated()) {
			this.option("activated", false);

			var event = new $.Event("deactivated");
			this.element.trigger(event);

			var toggle_event = new $.Event("toggled");
			toggle_event.activated = this.isActivated();
			this.element.trigger(toggle_event);
		}
	},
	isActivated: function() {
		return this.option("activated");
	}
});

/*

$.widget("confapp.viewVoterID", {
	options: {
		userData: false,
		database: false,
		numCharactersToShow: 3
	},
	_create: function() {
		var userData = this.option('userData');
		var database = this.option('database');
		this._addClickListeners();
		userData.onSetVoterID(this._updateMessage, this);

		if(database.getConferenceInfo().vote) {
			this._updateMessage();
			this.element.addClass('ca-button voter_id');
		}
	},
	_destroy: function() {
		this._removeClickListeners();
	},

	_updateMessage: function() {
		var userData = this.option('userData');
		var voterID = userData.getVoterID();
		var message;
		if(voterID) {
			var numCharactersToShow = this.option('numCharactersToShow');
			var displayedVoterID = '';
			var len = voterID.length;
			for(var i = 0; i<len; i++) {
				displayedVoterID += (i < len-numCharactersToShow) ? '*' : voterID[i];
			}
			message = 'Voter ID: ' + displayedVoterID;
		} else {
			message = 'Set Voter ID';
		}
		this.element.text(message);
	},

	_addClickListeners: function() {
		this.element.on("click.view_voter_id", $.proxy(function(event) {
			requestVoterID(this.option('userData'));
		}, this));
	},

	_removeClickListeners: function() {
		this.element.off("click.view_voter_id");
	},

	_setOption: function( key, value ) {
		this._super(key, value);
	}
});


function requestVoterID(userData, callback) {
	var isValid = false;
	var dialogContent = $(document.createElement('div'));
	var message = $('<p />').text('Please enter your six-character voter ID')
							.appendTo(dialogContent)
							.addClass('instructions');
	var voterIDInput = $('<input />').attr({
		type: 'text',
		placeholder: 'Voter ID',
		maxlength: 6
	}).appendTo(dialogContent).on('input', function(event) {
		var val = $(this).val();

		feedback.text('');
		var feedbackVehicles = voterIDInput.add(feedback);
		feedbackVehicles.removeClass('error success')
						.addClass('waiting');
		userData.checkVoterID(val, function(errorMessage, id) {
			feedbackVehicles.removeClass('waiting');
			if(errorMessage) {
				isValid = false;
				feedback.text(errorMessage);
				feedbackVehicles.addClass('error');
			} else {
				isValid = true;
				feedbackVehicles.addClass('success');
			}
		});
	}).on('keydown', function(event) {
		if(event.keyCode === 13) { // enter
			doSubmit();
		}
	});

	function doSubmit() {
		var id = voterIDInput.val();
		userData.setVoterID(id);
		dialogContent.dialog('destroy');

		if(callback) {
			callback(id, isValid);
		}
	}


	var buttonDiv = $('<div />').appendTo(dialogContent)
								.addClass('submit_buttons');

	var submitButton = $('<button />')	.text('OK')
										.appendTo(buttonDiv)
										.on('click', function() {
											doSubmit();
										})
										.css({
											'margin-right': '5px'
										});

	var cancelButton = $('<button />').text('Cancel')
										.appendTo(buttonDiv)
										.on('click', function() {
											dialogContent.dialog('destroy');
										});

	var feedback = $('<div />').addClass('voter_id_feedback')
								.appendTo(dialogContent);

	dialogContent.dialog({
		closeText: false,
		modal: true,
		draggable: false,
		resizable: false,
		dialogClass: "voter_id"
	});
	voterIDInput.val(userData.getVoterID());
	voterIDInput.focus().select();
}

*/