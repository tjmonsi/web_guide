var caWebOptions = {
	getAttachmentText: function(attachment) {
		var attachmentURL = attachment.getURL(),
			attachmentType = attachment.getType(),
			parsedURL = parseUri(attachmentURL);
		return attachmentType + ' (' + parsedURL.host + ')';
	}
};
