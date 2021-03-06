// This file is used to send data to Concord's CODAP system; it is preliminary code based on a sample from Concord.


// initialize a codapInterface object
function initCodapBridge() {
	codapInterface.init({
		name: 'DataFlow',
		title: 'Data Flow',
		dimensions: {width: 900, height: 600},
		version: '0.1'
	}).then(function () {
		// Determine if CODAP already has the Data Context we need.
		// If not, create it.
		return codapInterface.sendRequest({
			action:'get',
			resource: 'dataContext[Flow_Data]'
		}, function (iResult, iRequest) {
			if (iResult && !iResult.success) {
				codapInterface.sendRequest({
					action: 'create',
					resource: 'dataContext',
					values: {
						name: "Flow_Data",
					}});
				}
			}
		);
	});
}


// This object handles the semantics of the page.
var CodapTest = {
	state: codapInterface.getInteractiveState(),

	// set the format of the collection; attributes should be a list of fields: [{name: 'field_a', ...}, {name: 'field_b', ...}];
	// see CODAP docs for more info about attributes
	prepCollection: function(attrs) {
		console.log('adding', attrs.length, 'fields to CODAP collection');
		codapInterface.sendRequest({
			action: 'create',
			resource: 'collection',
			values: [  // There are two collections: a parent and a child
				{
					name: 'samples',
					// The parent collection has just one attribute
					attrs: [{name: "sample", type: 'categorical'}],
					childAttrName: "sample"
				},
				{
					name: 'points',
					parent: 'samples',
					labels: {
						pluralCase: "points",
						setOfCasesWithArticle: "a sample"
					},
					attrs: attrs,
				}
			]
		});
	},

    // send a log message to CODAP, values should be a dictionary: {topic: <string>, formatStr: <string>, replaceArgs: <array>}
    // where topic is optional and formatStr can contain %@ placeholders that are replaced with the values in replaceArgs.
    // example: {formatStr: "Launched rocket with %@ engine toward %@", replaceArgs: ["red", "satellite"]}
    log: function (values) {
        // ignore logging if not running in CODAP
		if(codapInterface.connectionState !== 'active') {
			return;
		}

        codapInterface.sendRequest({
            action: 'notify',
            resource: 'logMessage',
            values: values
        });
    },

    // shortcut for log() that sets formatStr based on topic
    logTopic: function (topic) {
        this.log({
            topic: topic,
            formatStr: "Logging topic: %@",
            replaceArgs: [topic]
        });
    },

	// send data to the CODAP; data should be a list of dictionaries: [{field_a: 1, field_b: 2}, {field_a: 3, field_b: 4}]
	sendData: function(data) {
		console.log('sending', data.length, 'points to CODAP');

		// we assume the connection should have been made by the time a button is
		// pressed.
		if(codapInterface.connectionState !== 'active') {
			alert("not running in codap");
			return;
		}

		// This function is called once the parent case is opened
		var sendData = function(iResult) {
			var tID = iResult.values[0].id;
			var values = [];
			for (var i = 0; i < data.length; i++) {
				values.push({
					parent: tID,
					values: data[i],
				});
			}
			codapInterface.sendRequest({
				action: 'create',
				resource: 'collection[points].case',
				values: values,
			});
		};

		// We keep track of the sampleNumber in interactiveState. If it doesn't exist
		// yet, create it.
		if (this.state.sampleNumber === undefined || this.state.sampleNumber === null) {
			this.state.sampleNumber = 0;
		}

		// increment sample number.
		this.state.sampleNumber++;

		// Tell CODAP to open a parent case and call sendData when done
		codapInterface.sendRequest({
			action: 'create',
			resource: 'collection[samples].case',
			values: {values: {sample: this.state.sampleNumber}}
		}).then(sendData);
	}
};
