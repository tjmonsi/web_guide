(function(root) {
	var MINUTE_IN_MS = 60*1000,
		DAY_IN_MS = 24*60*MINUTE_IN_MS,
		EVENT_TABLE = "event",
		PERSON_TABLE = "person",
		LOCATION_TABLE = "location",
		CONFERENCE_TABLE = "conference",
		ATTACHMENT_TABLE = "attachment",
		ANNOTATION_TABLE = "annotation",
		DB_INFO_TABLE = "db_info",
		DO_BREAK = {},
		JSONP_DATA_VAR_NAME = "_cadata_";

	var ConfAppAnnotation = function(options, database) {
		this._options = options;
	};
	(function(My) {
		var proto = My.prototype,
			optionGetters = {
				getID: "_id",
				getDescription: "description",
				getIcon: "icon",
				getName: "name",
				getType: "type",
				getSequence: "sequence"
			};
		each(optionGetters, function(prop_name, fn_name) {
			proto[fn_name] = function() {
				return this._options[prop_name];
			};
		});
	}(ConfAppAnnotation));
	var ConfAppAttachment = function(options, database) {
		this._options = options;
	};
	(function(My) {
		var proto = My.prototype,
			optionGetters = {
				getID: "_id",
				getType: "type",
				getURL: "url",
				getDirectory: "directory",
				getFilename: "filename"
			};
		each(optionGetters, function(prop_name, fn_name) {
			proto[fn_name] = function() {
				return this._options[prop_name];
			};
		});
	}(ConfAppAttachment));

	var ConfAppEvent = function(options, database) {
		this._options = options;
		this._db = database;
		this._people = false;
		this._events = false;
		this._num_sub_events = false;
		this._location = false;
		this._attachments = false;
		this._annotations = false;
		this._parent = false;
	};
	(function(My) {
		var proto = My.prototype,
			optionGetters = {
				getID: "_id",
				getUniqueID: "unique_id",
				getType: "type",
				getName: "title",
				getPersonDemonym: "person_demonym",
				getEventDemonym: "event_demonym",
				getDescription: "description",
				getShortDescription: "short_description"
			};
		each(optionGetters, function(prop_name, fn_name) {
			proto[fn_name] = function() {
				return this._options[prop_name];
			};
		});

		proto.getStartTimestamp = function() {
			return this._options.start_time*1000;
		};
		proto.getEndTimestamp = function() {
			return this._options.end_time*1000;
		};

		proto.getUTCOffset = function() {
			return this._options.utc_offset * MINUTE_IN_MS;
		};
		proto.isTopLevel = function() {
			return this._options.parent_fk < 0;
		};
		proto.getParent = function() {
			var parent_fk = this._options.parent_fk;
			if(parent_fk < 0) {
				return false;
			} else if(this._parent) {
				return this._parent;
			} else {
				return (this._parent = this._db.getEventWithID(parent_fk));
			}
		};
		proto.getNumSubEvents = function() {
			if(this._num_sub_events === false) {
				this._num_sub_events = this._db.getNumSubEvents(this);
			}
			return this._num_sub_events;
		};
		proto.isSingular = function() { return this.getNumSubEvents() === 1; };
		proto.getSubEvents = function() {
			if(!this._events) {
				this._events = this._db.getSessionEvents(this, this._num_sub_events);
				this._num_sub_events = this._events.length;
			}
			return this._events;
		};
		proto.getLocation = function() {
			if(!this._location) {
				this._location = this._db.getLocation(this._options.location_fk);
			}
			return this._location;
		};
		proto.getPeople = function() {
			if(!this._people) {
				this._people = this._db.getEventPeople(this);
			}
			return this._people;
		};
		proto.getAttachments = function() {
			if(!this._attachments) {
				this._attachments = this._db.getEventAttachments(this);
			}
			return this._attachments;
		};
		proto.getAnnotations = function() {
			if(!this._annotations) {
				this._annotations = this._db.getEventAnnotations(this);
			}
			return this._annotations;
		};
		proto.toString = function() {
			return this.getName();
		};
	}(ConfAppEvent));

	var ConfAppPerson = function(options, database) {
		this._options = options;
		this._db = database;
		this._events = false;
	};
	(function(My) {
		var proto = My.prototype,
			optionGetters = {
				getID: "_id",
				getName: "name",
				getLastName: "last_name",
				getAffiliation: "affiliation"
			};
		each(optionGetters, function(prop_name, fn_name) {
			proto[fn_name] = function() {
				return this._options[prop_name];
			};
		});

		proto.getEvents = function() {
			if(!this._events) {
				this._events = this._db.getPersonEvents(this);
			}
			return this._events;
		};
		proto.toString = function() {
			return this.getName() + " (" + this.getAffiliation() + ")";
		};
	}(ConfAppPerson));

	var ConfAppLocation = function(options, database) {
		this._options = options;
		this._db = database;
	};
	(function(My) {
		var proto = My.prototype,
			optionGetters = {
				getID: "_id",
				getName: "name",
				getShortName: "short_name",
				getDescription: "description",
				getSequence: "sequence",
				getMapName: "map_name",
				getMapFile: "map_file"
			};
		each(optionGetters, function(prop_name, fn_name) {
			proto[fn_name] = function() {
				return this._options[prop_name];
			};
		});
		proto.getMapLocation = function() {
			return {
				xPercent: this._options.map_x_pct,
				yPercent: this._options.map_y_pct
			};
		};
		proto.toString = function() {
			return this.getName();
		};
	}(ConfAppLocation));

	var ConfAppDB = function(db_url) {
		this._loaded = false;
		this._loaded_callbacks = [];

		this._database_info = false;
		this._conference_info = false;
		this._events = {};
		this._people = {};
		this._locations = {};
		this._headerMaps = {};
		this._annotations = {};
		this._attachments = {};

		this._firstNSearchResults = {};

		xhr('GET', db_url, false, function(response) {
			this._onDataFetched(JSON.parse(response));
		}, function(err) {
			incJS(db_url+"p", function() {
				if(root.hasOwnProperty(JSONP_DATA_VAR_NAME)) {
					this._onDataFetched(root[JSONP_DATA_VAR_NAME]);
				} else {
					throw new Error(err);
				}
			}, this);
		}, this);
	};

	(function(My) {
		var proto = My.prototype;

		proto._onDataFetched = function(data) {
			this._data = data;
			this._loaded = true;

			each(this._loaded_callbacks, function(callback_info) {
				callback_info.fn.call(callback_info.thisArg, this);
			}, this);
			this._loaded_callbacks = [];
		};

		function getCacheGetter(table_name, fk_map_name, Constructor) {
			return function(ids) {
				var fk_map = this[fk_map_name],
					table = this._data[table_name],
					rows = table.rows,
					headers = this.getHeaderMap(table_name),
					id_header = headers._id,
					retArray = isArray(ids),
					rv = [];

				each(retArray ? ids : [ids], function(id) {
					var item;
					if(fk_map.hasOwnProperty(id)) {
						item = fk_map[id];
					} else {
						var found = false,
							table = this._data[table_name],
							rows = table.rows,
							i = id-1,
							row = rows[i],
							id_header = table.headers.indexOf("_id");

						if(row[id_header] === id) {
							found = true;
						} else {
							console.error("Using longhand search");
							for(i = 0; i<rows.length; i++) {
								row = rows[i];
								if(row[id_header] === id) {
									found = true;
									break;
								}
							}
						}

						if(found) {
							item = new Constructor(_toObject(table, row), this);
						} else {
							item = false;
						}

						fk_map[id] = item;
					}
					rv.push(item);
				}, this);

				return retArray ? rv : rv[0];
			};
		}

		proto.getID = function() {
			var conference_info = this.getConferenceInfo();
			return conference_info.id;
		};

		proto.getHeaderMap = function(tableName) {
			if(this._headerMaps.hasOwnProperty(tableName)) {
				return this._headerMaps[tableName];
			} else {
				var headers = this._data[tableName].headers,
					map = _getMap(headers);
				return (this._headerMaps[tableName] = _getMap(headers));
			}
		};

		proto.getEventWithID      = getCacheGetter(EVENT_TABLE, "_events", ConfAppEvent);
		proto.getPersonWithID     = getCacheGetter(PERSON_TABLE, "_people", ConfAppPerson);
		proto.getLocationWithID   = getCacheGetter(LOCATION_TABLE, "_locations", ConfAppLocation);
		proto.getAttachmentWithID = getCacheGetter(ATTACHMENT_TABLE, "_attachments", ConfAppAttachment);
		proto.getAnnotationWithID = getCacheGetter(ANNOTATION_TABLE, "_annotations", ConfAppAnnotation);

		proto.onLoad = function(callback, thisArg) {
			if(!thisArg) { thisArg = root; }

			if(this.hasLoaded()) {
				callback.call(thisArg, this);
			} else {
				this._loaded_callbacks.push({
					fn: callback,
					thisArg: thisArg
				});
			}
			return this;
		};

		proto.hasLoaded = function() {
			return this._loaded;
		};

		proto.getConferenceInfo = function() {
			if(this._conference_info) {
				return this._conference_info;
			} else {
				var conference = this._data.conference,
					conference_row = conference.rows[0],
					headers = this.getHeaderMap(CONFERENCE_TABLE);

				return (this._conference_info = _toObject(conference, conference_row));
			}
		};
		proto.getDatabaseInfo = function() {
			if(this._database_info) {
				return this._database_info;
			} else {
				var database = this._data.db_info,
					database_row = database.rows[0],
					headers = this.getHeaderMap(DB_INFO_TABLE);

				return (this._database_info = _toObject(database, database_row));
			}
		};

		proto.getDayTimestamps = function() {
			var conference_info = this.getConferenceInfo(),
				start_timestamp = conference_info.start_day*1000,
				num_days = conference_info.num_days,
				rv = [], i = 0;

			if(num_days === 0) { // we don't have any times input yet
				rv = false;
			} else {
				for(; i<num_days; i++) {
					rv[i] = start_timestamp + i * DAY_IN_MS;
				}
			}

			return rv;
		};

		proto.getUTCOffset = function() {
			var conference_info = this.getConferenceInfo();
			return conference_info.utc_offset * MINUTE_IN_MS;
		};

		proto.getEventWithUniqueID = function(unique_id) {
			var event = this._data.event,
				rows = event.rows,
				headers = this.getHeaderMap(EVENT_TABLE),
				fk_header = headers._id,
				uid_header = headers.unique_id,
				len = rows.length;

			for(var i = 0; i<len; i++) {
				var row = rows[i];
				if(row[uid_header]===unique_id) {
					return this.getEventWithID(row[fk_header]);
				}
			}
			return false;
		};

		proto.filterSessions = function(filter_fn) {
			var event = this._data.event,
				rows = event.rows,
				headers = this.getHeaderMap(EVENT_TABLE),
				fk_header = headers._id,
				rv = [];

			each(rows, function(row) {
				var session, fk = row[fk_header];
				if(!filter_fn || filter_fn(row)) {
					session = this.getEventWithID(fk);
					if(session) {
						rv.push(session);
					}
				}
			}, this);

			rv.sort(function(sessiona, sessionb) {
				var locationa = sessiona.getLocation(),
					locationb = sessionb.getLocation(),
					seqa = locationa ? locationa.getSequence() : -1,
					seqb = locationb ? locationb.getSequence() : -1;

				return seqa-seqb;
			});

			return rv;
		};

		proto.filterPeople = function(filter_fn) {
			var person = this._data.person,
				rows = person.rows,
				headers = this.getHeaderMap(PERSON_TABLE),
				fk_header = headers._id,
				rv = [];

			each(rows, function(row) {
				var person, fk = row[fk_header];
				if(!filter_fn || filter_fn(row)) {
					person = this.getPersonWithID(fk);
					if(person) {
						rv.push(person);
					}
				}
			}, this);

			return rv;
		};

		proto.getSessionsBetween = function(start_time, end_time) {
			var event = this._data.event,
				headers = this.getHeaderMap(EVENT_TABLE),
				start_time_header = headers.start_time,
				parent_fk_header = headers.parent_fk,
				time_filter_fn = function(row) {
					var event_start_time = row[start_time_header] * 1000,
						session, fk;
					return row[parent_fk_header] < 0 && event_start_time >= start_time &&
							event_start_time <= end_time;
				},
				sessions = this.filterSessions(time_filter_fn);

			sessions.sort(function(a, b) {
				return a.getStartTimestamp() - b.getStartTimestamp();
			});

			return sessions;
		};

		proto.getDaySessions = function(dayTimestamp) {
			if(dayTimestamp instanceof Date) {
				dayTimestamp = dayTimestamp.getTime();
			}
			return this.getSessionsBetween(dayTimestamp, dayTimestamp + DAY_IN_MS - 1);
		};

		proto.getAllSessions = function() {
			var event = this._data.event,
				headers = this.getHeaderMap(EVENT_TABLE),
				parent_fk_header = headers.parent_fk,
				top_level_filter = function(row) {
					return row[parent_fk_header] < 0;
				};

			return this.filterSessions(top_level_filter);
		};

		proto.getAllPapers = function() {
			var event = this._data.event,
				headers = this.getHeaderMap(EVENT_TABLE),
				parent_fk_header = headers.parent_fk,
				top_level_filter = function(row) {
					return row[parent_fk_header] >= 0;
				};

			return this.filterSessions(top_level_filter);
		};

		proto.getAllPeople = function() {
			return this.filterPeople(function() { return true; });
		};

		proto.getPeopleWithAffiliation = function(affiliation) {
			var person = this._data.person,
				headers = this.getHeaderMap(PERSON_TABLE),
				affiliation_header = headers.affiliation,
				top_level_filter = function(row) {
					return row[affiliation_header] === affiliation;
				};

			return this.filterPeople(top_level_filter);
		};

		proto.getEventPeople = function(event) {
			var event_people = this._data.event_people,
				ep_rows = event_people.rows,
				ep_headers = _getMap(event_people.headers),
				event_fk = event.getID(),
				person_fks = [];

			each(ep_rows, function(row) {
				if(row[ep_headers.event_fk] === event_fk) {
					person_fks[row[ep_headers.sequence]] = row[ep_headers.person_fk];
				}
			});

			return this.getPersonWithID(person_fks);
		};

		proto.getEventAttachments = function(event) {
			var event_attachments = this._data.event_attachments,
				rows = event_attachments.rows,
				headers = _getMap(event_attachments.headers),
				fk = event.getID(),
				attachments = [];

			each(rows, function(row) {
				if(row[headers.event_fk] === fk) {
					attachments.push(new ConfAppAttachment(_toObject(event_attachments, row), this));
				}
			}, this);

			return attachments;
		};

		proto.getEventAnnotations = function(event) {
			var event_annotations = this._data.event_annotations,
				rows = event_annotations.rows,
				headers = _getMap(event_annotations.headers),
				annotation_fks = [],
				fk = event.getID();

			each(rows, function(row) {
				if(row[headers.event_fk] === fk) {
					annotation_fks.push(row[headers.annotation_fk]);
				}
			}, this);

			return this.getAnnotationWithID(annotation_fks);
		};

		proto.getLocation = function(fk) {
			if(fk >= 0) {
				return this.getLocationWithID(fk);
			} else {
				return undefined;
			}
		};

		proto.getSessionEvents = function(session, limit) {
			var event_events = this._data.event_events,
				ee_rows = event_events.rows,
				ee_headers = _getMap(event_events.headers),
				event = this._data.event,
				e_rows = event.rows,
				e_headers = _getMap(event.headers),
				parent_fk = session.getID(),
				child_fks = [],
				count = 0,
				child;

			each(ee_rows, function(row) {
				if(row[ee_headers.parent_fk] === parent_fk) {
					var sequence = row[ee_headers.sequence],
						child_fk = row[ee_headers.child_fk];
					child_fks[sequence] = child_fk;
					count++;
					if(limit && count > limit) {
						return DO_BREAK;
					}
				}
			});

			return this.getEventWithID(child_fks);
		};

		proto.getNumSubEvents = function(session) {
			var event_events = this._data.event_events,
				ee_rows = event_events.rows,
				ee_headers = _getMap(event_events.headers),
				count = 0;

			each(ee_rows, function(row) {
				if(row[ee_headers.parent_fk] === parent_fk) {
					count++;
				}
			});

			return count;
		};

		proto.getPersonEvents = function(person) {
			var event_people = this._data.event_people,
				ep_rows = event_people.rows,
				ep_headers = _getMap(event_people.headers),
				event = this._data.event,
				e_rows = event.rows,
				e_headers = _getMap(event.headers),
				event_ids = [],
				fk = person.getID();

			each(ep_rows, function(row) {
				if(row[ep_headers.person_fk] === fk) {
					var event_fk = row[ep_headers.event_fk];
					event_ids.push(event_fk);
				}
			}, this);

			return this.getEventWithID(event_ids);
		};


		proto.doSearch = function(queryString, avoid_search_descriptions) {
			var person = this._data.person,
				p_rows = person.rows,
				p_headers = _getMap(person.headers),
				event = this._data.event,
				e_rows = event.rows,
				e_headers = _getMap(event.headers),
				p_id_index = p_headers._id,
				p_name_index = p_headers.name,
				p_affiliation_index = p_headers.affiliation,
				e_id_index = e_headers._id,
				e_title_index = e_headers.title,
				e_type_index = e_headers.type,
				e_description_index = e_headers.description,
				e_parent_fk_index = e_headers.parent_fk,
				rv,
				first_four_letters = queryString.toLowerCase().slice(0, 3),
				ffr = this._firstNSearchResults[first_four_letters],
				also_search_descriptions = !avoid_search_descriptions;

			if(!ffr) {
				rv = {};
				each(p_rows, function(row) {
					if(row[p_name_index].toLowerCase().indexOf(first_four_letters) >= 0) {
						if(rv.people) {
							rv.people.push(row);
						} else {
							rv.people = [row];
						}
					}
					if(row[p_affiliation_index] && row[p_affiliation_index].toLowerCase().indexOf(first_four_letters) >= 0) {
						if(!rv.affiliations) {
							rv.affiliations = {};
						}
						rv.affiliations[row[p_affiliation_index]] = {institute: row[p_affiliation_index]};
					}
				});

				each(e_rows, function(row) {
					if((row[e_title_index].toLowerCase().indexOf(first_four_letters) >= 0) ||
						(also_search_descriptions && row[e_description_index] &&
							(row[e_description_index].toLowerCase().indexOf(first_four_letters) >= 0))) {
						if(row[e_parent_fk_index] < 0) {
							if(rv.sessions) {
								rv.sessions.push(row);
							} else {
								rv.sessions = [row];
							}
						} else {
							if(rv.papers) {
								rv.papers.push(row);
							} else {
								rv.papers = [row];
							}
						}
					}
				});

				ffr = this._firstNSearchResults[first_four_letters] = rv;
			}

			queryString = queryString.toLowerCase();

			rv = {
				people: filter(ffr.people, function(row) {
					if(row[p_name_index].toLowerCase().indexOf(queryString) >= 0) {
						return this.getPersonWithID(row[p_id_index]);
					} else {
						return false;
					}
				}, this),
				affiliations: filter(ffr.affiliations, function(affiliation) {
					if(affiliation.institute.toLowerCase().indexOf(queryString) >= 0) {
						return affiliation;
					} else {
						return false;
					}
				}, this),
				sessions: filter(ffr.sessions, function(row) {
					var shouldShow = (row[e_title_index].toLowerCase().indexOf(queryString) >= 0) ||
							(row[e_type_index].toLowerCase().indexOf(queryString) >= 0) ||
							(also_search_descriptions && row[e_description_index] &&
								(row[e_description_index].toLowerCase().indexOf(queryString) >= 0));
					if(shouldShow) {
						return this.getEventWithID(row[e_id_index]);
					} else {
						return false;
					}
				}, this),
				papers: filter(ffr.papers, function(row) {
					var shouldShow =  (row[e_title_index].toLowerCase().indexOf(queryString) >= 0) ||
							(also_search_descriptions && row[e_description_index] &&
								(row[e_description_index].toLowerCase().indexOf(queryString) >= 0));

					if(shouldShow) {
						return this.getEventWithID(row[e_id_index]);
					} else {
						return false;
					}
				}, this)
			};
			each(rv, function(val, key) {
				if(val.length === 0) {
					delete rv[key];
				}
			});
			return rv;
		};
	}(ConfAppDB));

	root.confApp = {
		Database: ConfAppDB,
		Event: ConfAppEvent,
		Person: ConfAppPerson,
		Location: ConfAppLocation,
		loadDatabase: function(db_url, callback, thisArg) {
			var database = new ConfAppDB(db_url);
			if(callback) {
				database.onLoad(callback, thisArg);
			}
			return database;
		}
	};

	function _getMap(arr) {
		var rv = {};
		each(arr, function(item, i) { rv[item] = i; });
		return rv;
	}

	function _toObject(table, row) {
		var headers = table.headers,
			rv = {};
		each(table.headers, function(header, i) {
			rv[header] = row[i];
		});
		return rv;
	}

	function xhr(type, url, data, success, error, thisArg) {
		var XHR = root.XMLHttpRequest || ActiveXObject;
		var request = new XHR('MSXML2.XMLHTTP.3.0');
		request.open(type, url, true);
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		request.onreadystatechange = function () {
			if (request.readyState === 4) {
				if (request.status >= 200 && request.status < 300) {
					success.call(thisArg, request.response);
				} else {
					error.call(thisArg, request);
				}
			}
		};
		try {
			request.send(data);
		} catch(e) {
			//console.error(e);
		}
	}
	function incJS(url, success, thisArg) {
		var headEl = document.getElementsByTagName('head').item(0),
			scriptEl = document.createElement( "script" );
		scriptEl.type = "text/javascript";
		scriptEl.onreadystatechange = function() {
			if (this.readyState == 'complete') {
				success.call(thisArg);
			}
		};
		scriptEl.onload = function () {
			success.call(thisArg);
		};
		scriptEl.src = url;
		headEl.appendChild(scriptEl);
	}


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

	var nativeIsArray = Array.isArray,
		isArray = nativeIsArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		};
}(this));
