$.widget("confapp.location", {
	options: {
		location: false,
		mapImageDirectory: false,
		imageDirectory: false,
		mapMarker: "map_marker.png",
		mapMarkerWidth: "30px",
		mapMarkerHeight: "30px"
	},

	_create: function() {
		var location = this.option("location");
		if(location) {
			this.element.text(location.getName());
			this._addClasses();
			this._addTooltips();
		}
	},

	_destroy: function() {
		var location = this.option("location");
		if(location) {
			this._destroyTooltips();
		}
	},

	_setOption: function( key, value ) {
		this._super(key, value);
	},

	_addClasses: function() {
		this.element.addClass("location");
	},

	_addTooltips: function() {
		this.element.tooltip({
			position: { my: 'center bottom', at: 'center top-5' },
			items: '.location',
			content: $.proxy(function () {
				var location = this.option('location');
				var name = location.getName(),
					mapFile = location.getMapFile(),
					mapLocation = location.getMapLocation();

				var rvElem = $('<div />');
				var nameElem = $('<div />').text(name)
											.addClass('location_name')
											.appendTo(rvElem)
											.css({
												"text-align": "center",
												"font-size": "1.5em",
												"font-weight": "100",
												"color": "#DDD"
											});
				if(mapFile) {
					var mapElement = $('<div />').appendTo(rvElem)
												.css({
													position: 'relative'
												});
					var imgElement = $('<img />')	.attr('src', location.getMapURL() || (this.option('mapImageDirectory') + mapFile))
													.addClass('map')
													.css({
														width: "100%"
													});

					if(mapLocation && mapLocation.xPercent >= 0 && mapLocation.yPercent >= 0) {
						var markerElement = $('<img />').addClass('marker')
														.attr('src', this.option('imageDirectory') + this.option('mapMarker'))
														.css({
															position: "absolute",
															left: (100*mapLocation.xPercent) + "%",
															top: (100*mapLocation.yPercent) + "%",
															width: this.option("mapMarkerWidth"),
															height: this.option("mapMarkerHeight")
														})
														.appendTo(mapElement);
					}
					imgElement.appendTo(mapElement);
				}
				return rvElem.html();
			}, this),
			show: false,
			hide: false
		});
	},
	_destroyTooltips: function() {
		this.element.tooltip('destroy');
	}
});
