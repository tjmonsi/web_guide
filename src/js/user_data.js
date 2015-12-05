var USER_DATA_LOCAL_STORAGE = "CONFAPP_USER_DATA";
var USER_DATA_OTHER_STORAGE = "CONFAPP_USER_DATA_OTHER";

var voter_id, id_token;
var endsWith = function(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

var getFieldDefault = function(field_name) {
		if(field_name === "created_at" || endsWith(field_name, "updated_at")) {
			return new Date(0);
		} else if(field_name === "note") {
			return "";
		} else {
			return false;
		}
};

var dataRowFields = ["schedule", "reading_list", "note", "vote"];
var UserDataRow = function(event_id, userData, options) {
	this._options = options;
	this._userData = userData;
	this._listeners = userData._row_listeners[event_id] || [];
	delete userData._row_listeners[event_id];
	if(this._listeners.length > 0) {
		$.each(dataRowFields, $.proxy(function(i, field_name) {
			if(this._options.hasOwnProperty(field_name)) {
				this._notifyListeners(field_name, this._options[field_name]);
			}
		}, this));
	}
};
(function(My) {
	var proto = My.prototype;

	proto._doSetField = function(field_name, field_value, updated_at) {
		this._options[field_name] = field_value;
		this._doSetUpdatedAtField(field_name, updated_at);
		this._notifyListeners.apply(this, arguments);
	};

	proto._doSetUpdatedAtField = function(field_name, updated_at) {
		this._options[field_name+"_updated_at"] = updated_at;
	};

	proto._notifyListeners = function(field_name, field_value) {
		$.each(this._listeners, function(index, info) {
			info.callback.call(info.thisArg || this, field_name, field_value);
		});
	};

	proto._notifyFieldChange = function(field_name, field_value, updated_at, callback, thisArg) {
		this._setWebDataRow(field_name, field_value, updated_at,
						function(err, row) {
							if(!err) {
								this._doSetField(field_name, row.getField(field_name), row.getFieldUpdatedAt(field_name));
							}
							if(callback) {
								callback.apply(thisArg || this, arguments);
							}
						}, this);
	};

	proto.setField = function(field_name, field_value, callback, thisArg) {
		var timestamp = new Date(),
			args = rest(arguments, 0);

		args.splice(2, 0, timestamp); // insert a timestamp into the arguments

		this._doSetField.apply(this, args);
		this._notifyFieldChange.apply(this, args);
	};
	proto.setFieldAndSave = function(field_name, field_value, callback, thisArg) {
		return this.setField(field_name, field_value, function() {
			var userData = this.getParent();
			userData.saveLocally();
			if(callback) {
				callback.apply(thisArg || this, arguments);
			}
		}, this);
	};
	proto.getField = function(field_name) {
		if(this._options.hasOwnProperty(field_name)) {
			return this._options[field_name];
		} else {
			return getFieldDefault(field_name);
		}
	};
	proto.getFieldUpdatedAt = function(field_name) {
		return this.getField(field_name+"_updated_at");
	};
	proto.merge = function(otherRow) {
		var changedFields = [];
		$.each(dataRowFields, $.proxy(function(index, field_name) {
			var updated_at = this.getFieldUpdatedAt(field_name),
				other_updated_at = otherRow.getFieldUpdatedAt(field_name),
				updated_at_timestamp = updated_at.getTime(),
				other_updated_at_timestamp = other_updated_at.getTime(),
				other_value = otherRow.getField(field_name),
				my_value = this.getField(field_name);

			if(other_updated_at_timestamp > updated_at_timestamp) {
				this._doSetField(field_name, other_value, other_updated_at);
				changedFields.push(field_name);
			} else if(other_value !== my_value){
				this._notifyFieldChange(field_name, my_value, updated_at);
			}
		}, this));
		return changedFields;
	};
	proto.getParent = function() {
		return this._userData;
	};
	proto.onChange = function(callback, thisArg, name) {
		this._listeners.push({
			callback: callback,
			thisArg: thisArg,
			name: name
		});
	};
	proto.offChange = function(name) {
		for(var i = 0; i<this._listeners.length; i++) {
			var listener = this._listeners[i];
			if(listener.name === name) {
				this._listeners.splice(i, 1);
				i--;
			}
		}
	};
	proto.serialize = function() {
		var obj = {};
		$.each(this._options, function(property_name, value) {
			if(property_name === "created_at" || endsWith(property_name, "updated_at")) {
				obj[property_name] = value.getTime();
			} else  {
				obj[property_name] = value;
			}
		});
		return obj;
	};
	proto._setWebDataRow = function(field_name, field_value, updated_at, callback, thisArg) {
		var userData = this.getParent();
		if(userData.canWebSync()) {
			var event_id = this.getField("event_id");

			if(field_name === "reading_list" || field_name === "schedule" || field_name === "vote") {
				field_value = field_value ? 1 : 0;
			}
			$.ajax({
				url: userData.getURL(),
				method: "POST",
				data: {
					command: "set_field",
					field: field_name,
					value: field_value,
					event_id: event_id,
					id_token: userData.getGoogleIDToken(),
					voter_id: userData.getVoterID(),
					conference_id: userData.getConferenceID(),
					updated_at: Math.round(updated_at.getTime() / 1000)
				},
				success: $.proxy(function(data) {
					if(data.result === "error") {
						callback.call(thisArg || this, data.error);
					} else {
						callback.call(thisArg || this, false, this.getParent().sqlToRow(data.value));
					}
				}, this),
				error: function(jqXHR, textStatus, errorThrown) {
					callback.call(thisArg || this, errorThrown);
				}
			});
		}
	};
}(UserDataRow));

var UserData = function(firebaseRef, conference_id, canWebSync, callback, thisArg) {
	this._firebaseRef = firebaseRef;
	this._canWebSync = canWebSync;
	this._conference_id = conference_id;
	this._loaded = false;
	this._load_listeners = [];
	this._row_listeners = {};
	this._listeners = {};
	this.rows = {};

	if(callback) {
		this.onLoad(callback, thisArg);
	}
	this.loadLocally();
	console.log(this.getFirebaseRef());

	if(this._firebaseRef) {
		this._firebaseRef.onAuth(this._onAuth, this);
	}
};
(function(My) {
	var proto = My.prototype;

	var merge_rows = function(event_id, row) {
		var existing_row = this.rows[event_id];
		if(existing_row) {
			var changed_fields = existing_row.merge(row),
				changed_values = $.map(changed_fields, function(field_name) {
					return existing_row.getField(field_name);
				});

		} else {
			this.rows[event_id] = row;
		}
	};

	proto._onAuth = function(authData) {
		console.log('onAuth', authData);
		if(authData) {
			this.webSync();
		}
	};

	proto.getFirebaseRef = function() {
		var rootRef = this._firebaseRef;
		var authInfo = rootRef.getAuth();
		if(authInfo) {
			var conference_id = this.getConferenceID().replace(/\./g, ''),
				user_id = authInfo.uid;
			return rootRef.child(conference_id).child(user_id);
		}
	},

	proto.webSync = function() {
		if(this.canWebSync()) {
			var found_rows = {};
			$.each(this.rows, function(key, value) {
				found_rows[key] = false;
			});
			this.getAllWebData(function(err, rows) {
				if(!err) {
					var do_merge_rows = $.proxy(merge_rows, this);

					$.each(rows, do_merge_rows);
					$.each(rows, function(key, row) {
						found_rows[key] = true;
					});
					$.each(found_rows, $.proxy(function(event_id, was_found) {
						if(!was_found) {
							var otherRow = new UserDataRow(event_id, this, {event_id: event_id});
							do_merge_rows(event_id, otherRow);
						}
					}, this));
				}
			}, this);
		}
	};
	proto.getRow = function(event_id, avoid_create) {
		if(this.rows.hasOwnProperty(event_id)) {
			return this.rows[event_id];
		} else if(!avoid_create) {
			var row = new UserDataRow(event_id, this, {event_id: event_id});
			this.rows[event_id] = row;
			return row;
		}
	};
	proto.loadLocally = function() {
		var do_merge_rows = $.proxy(merge_rows, this);

		$.each(this.getLocalStorageRows(this.getConferenceID()), do_merge_rows);
		this._onLoaded();

		var other_str = localStorage.getItem(USER_DATA_OTHER_STORAGE);
		if(other_str) {
			try {
				var other_obj = JSON.parse(other_str);
				if(other_obj.voter_id) {
					this.setVoterID(other_obj.voter_id);
				}
			} catch(e) {
				console.error(e);
			}
		}

		return this;
	};
	proto._onLoaded = function() {
		this._loaded = true;
		$.each(this._load_listeners, function(index, info) {
			info.callback.call(info.thisArg);
		});
		this._load_listeners = [];
	};
	proto.onLoad = function(callback, thisArg) {
		if(!thisArg) { thisArg = this; }

		if(this.isLoaded()) {
			callback.call(thisArg);
		} else {
			this._load_listeners.push({
				callback: callback,
				thisArg: thisArg
			});
		}

		return this;
	};
	proto.isLoaded = function() {
		return this._loaded;
	};
	proto.getField = function(event_id, field_name) {
		var row = this.getRow(event_id, true);
		if(row) {
			return row.getField(field_name);
		} else {
			return getFieldDefault(field_name);
		}
	};
	proto.setField = function(event_id) {
		var row = this.getRow(event_id);
		return row.setField.apply(row, rest(arguments, 1));
	};
	proto.setGoogleIDToken = function(id_token) {
		this._google_id_token = id_token;
		this.webSync();
	};
	proto.getGoogleIDToken = function() {
		return this._google_id_token;
	};
	proto.serialize = function() {
		var rv = {};
		$.each(this.rows, function(event_id, row) {
			rv[event_id] = row.serialize();
		});
		return rv;
	};
	proto.setFieldAndSave = function(event_id, field_name, field_value, callback, thisArg) {
		var row = this.getRow(event_id);
		return row.setFieldAndSave.apply(row, rest(arguments, 1));
	};
	proto.stringify = function() {
		return JSON.stringify(this.serialize());
	};
	proto.setVoterID = function(id) {
		this._voter_id = id;
		var listeners = this._listeners.voter_id;
		if(listeners) {
			$.each(listeners, function(index, info) {
				info.callback.call(info.thisArg || this, id);
			});
		}
		this.webSync();
	};
	proto.getVoterID = function() {
		return this._voter_id;
	};
	proto.saveLocally = function() {
		localStorage.setItem(USER_DATA_LOCAL_STORAGE, this.stringify());
		localStorage.setItem(USER_DATA_OTHER_STORAGE, JSON.stringify({
			voter_id: this.getVoterID()
		}));
	};
	proto.canWebSync = function() { return this._canWebSync; };
	proto.getURL = function() { return this._url; };
	proto.getConferenceID = function() { return this._conference_id; };

	proto.onSetVoterID = function(callback, thisArg, name) {
		var event_type = 'voter_id';
		var listeners = this._listeners[event_type];
		if(!listeners) {
			listeners = this._listeners[event_type] = [];
		}
		listeners.push({
			callback: callback,
			thisArg: thisArg,
			name: name
		});
	};
	proto.onChange = function(event_id, callback, thisArg, name) {
		var row = this.getRow(event_id, true);
		if(row) {
			row.onChange.apply(row, rest(arguments, 1));
		} else {
			var listeners = this._row_listeners[event_id];
			if(!listeners) {
				listeners = this._row_listeners[event_id] = [];
			}
			listeners.push({
				callback: callback,
				thisArg: thisArg,
				name: name
			});
		}
	};
	proto.offChange = function(event_id, name) {
		var row = this.getRow(event_id, true);
		if(row) {
			row.offChange.apply(row, rest(arguments, 1));
		} else {
			var listeners = this._row_listeners[event_id];
			for(var i = 0; i<listeners.length; i++) {
				var listener = listeners[i];
				if(listener.name === name) {
					listeners.splice(i, 1);
					i--;
				}
			}
		}
	};

	proto.getLocalStorageRows = function() {
		var data_str = localStorage.getItem(USER_DATA_LOCAL_STORAGE);
		if(data_str) {
			try {
				var data_obj = JSON.parse(data_str),
					rv = {};

				$.each(data_obj, $.proxy(function(event_id, row) {
					var obj = this.parseSerializedRow(row);
					rv[event_id] = obj;
				}, this));

				return rv;
			} catch(e) {
				console.error(e);
				return {};
			}
		} else {
			return {};
		}
	};

	proto.parseSerializedRow = function(row) {
		var options = {};
		$.each(row, function(property_name, value) {
			if(property_name === "created_at" || endsWith(property_name, "updated_at")) {
				options[property_name] = new Date(value);
			} else  {
				options[property_name] = value;
			}
		});
		return new UserDataRow(options.event_id, this, options);
	};

	proto.sqlToRow = function(row) { // accepts row from mysql db rv
		var options = {};
		$.each(row, function(property_name, value) {
			if(property_name === "created_at" || endsWith(property_name, "updated_at")) {
				if(value === "0000-00-00 00:00:00") {
					options[property_name] = new Date(0);
				} else {
					options[property_name] = new Date(value);
				}
			} else if(property_name === "note") {
				options[property_name] = value || "";
			} else if(property_name === "vote" || property_name === "reading_list" || property_name === "schedule") {
				options[property_name] = value === "1";
			} else {
				options[property_name] = value;
			}
		});
		return new UserDataRow(options.event_id, this, options);
	};
	/*

	proto.getWebDataRow = function(url, google_id_token, voter_id, conference_id, event_id, callback, thisArg) {
		$.ajax({
			url: url,
			method: "POST",
			data: {
				command: "get_fields",
				id_token: google_id_token,
				voter_id: voter_id,
				event_id: event_id,
				conference_id: conference_id
			},
			success: $.proxy(function(rv) {
				if(rv.result === "error") {
					callback.call(thisArg || this, rv.error);
				} else {
					var row = rv.value,
						data = this.sqlToRow(row);
					callback.call(thisArg || this, false, data);
				}
			}, this),
			error: function(jqXHR, textStatus, errorThrown) {
				callback.call(thisArg || this, errorThrown);
			}
		});
	};
	*/

	proto.getAllWebData = function(callback, thisArg) {
		if(this.canWebSync()) {
			$.ajax({
				url: this.getURL(),
				method: "POST",
				data: {
					command: "get_all_fields",
					id_token: this.getGoogleIDToken(),
					voter_id: this.getVoterID(),
					conference_id: this.getConferenceID()
				},
				success: $.proxy(function(rv) {
					if(rv.result === "error") {
						callback.call(thisArg || this, rv.error);
					} else {
						var rows = rv.value,
							data = {};

						$.each(rows, $.proxy(function(index, row) {
							var event_id = row.event_id;
							data[event_id] = this.sqlToRow(row);
						}, this));
						callback.call(thisArg || this, false, data);
					}
				}, this),
				error: function(jqXHR, textStatus, errorThrown) {
					callback.call(thisArg || this, errorThrown);
				}
			});
		}
	};
	proto.checkVoterID = function(id, callback, thisArg) {
		var len = id.length;
		if(len === 6) {
			if(id.match(/^[a-zA-Z0-9]{6}$/)) {
				$.ajax({
					url: this.getURL(),
					method: "POST",
					data: {
						command: "check_voter_id",
						voter_id: id,
						conference_id: this.getConferenceID()
					},
					success: $.proxy(function(data) {
						if(data.result === "error") {
							callback.call(thisArg || this, data.error);
						} else {
							if(data.valid && data.valid != 'false') {
								callback.call(thisArg || this, false, id);
							} else {
								callback.call(thisArg || this, 'We could not find this voter ID in our records');
							}
						}
					}, this),
					error: function(jqXHR, textStatus, errorThrown) {
						callback.call(thisArg || this, errorThrown);
					}
				});
			} else {
				callback('Voter ID should be alphanumeric');
			}
		} else {
			callback('Voter ID should be six characters');
		}
	};
}(UserData));

function rest(args, index) {
	return Array.prototype.slice.call(args, index);
}

function onGoogleSignin(googleUser) {
	$("#googleSignIn").google_signin("loggedIn", googleUser);
}

