var Autopilot = require('autopilot-api');
var autopilot = new Autopilot('8d846eac2979465d964ca9c01316eecd');
var http = require('http');
var sha1 = require('sha1');
var qs = require('querystring');
	var request = require('request');


var doceboConfig = {
	key: "k9DafQR8q_!TazjXTO_Tu#7!",
	secret: "8Ewcb!NHluSUAIlh8mI!vhKsB6M1As_2h4_S",
	host: "http://ceu.worldisdm.com/api/"}
 
var rest = require('restler');

var requestDocebo = function(endpoint, params, callback) {
	params['bla'] ='duh';
	var paramsAsStr = "";
	var paramsForLog = "";
	for (var i in params) {
		if (paramsAsStr) paramsAsStr+= ",";
		paramsAsStr += params[i]; //i + "," + 
		if (i != 'bla') paramsForLog += i + ":" + params[i] + ","; 
	}
	console.log(endpoint, paramsForLog);
	var doceboSecret = sha1(paramsAsStr + "," + doceboConfig.secret);
	doceboSecret = "Docebo " + new Buffer(doceboConfig.key + ":" + doceboSecret).toString('base64');
	//console.log(doceboSecret);

	var options = {
	  url: doceboConfig.host + endpoint,
	  headers: {
	    'X-Authorization': doceboSecret,
	    'Content-Type': 'multipart/form-data'
	  },
	  formData: params
	};


	rest.post(doceboConfig.host + endpoint, {
  	  multipart: true,
	  headers: {'X-Authorization': doceboSecret},
	  data: params
	}).on('complete', function(data, response) {
		callback(data);
	});

	/*function callbackInside(error, response, body) {
		console.log(endpoint, params,body);
	  if (!error && response.statusCode == 200) {
	    var info = JSON.parse(body);
		callback(info);
	  }
	}

	request(options, callbackInside);*/
}


//getDoceboUsers = function(callback){
//requestDocebo('user/count', {}, function(usersCount){

var globalFields;
var getFieldTitle = function(id){
	for (var i=0;i<globalFields.fields.length;i++){
		if (globalFields.fields[i].id == id ) return globalFields.fields[i].name.replace(/ /g, "--");

	}
	return 'UNKNOWN__FLD__' + id;
}

var processUser = function(id, callback){
	var toSendToAutopilot = {custom:{}};
	requestDocebo('user/profile', {'id_user':id}, function(singleUserProfile) {
		toSendToAutopilot.FirstName = singleUserProfile.firstname;
		toSendToAutopilot.LastName = singleUserProfile.lastname;
		toSendToAutopilot.Email = singleUserProfile.email;
		toSendToAutopilot.custom["string--register_date"] = singleUserProfile.register_date;
		toSendToAutopilot.custom["string--last_enter"] = singleUserProfile.last_enter;
		toSendToAutopilot.custom["string--userid"] = singleUserProfile.userid;

		if (singleUserProfile.fields) {
			for (var i=0;i<singleUserProfile.fields.length;i++) {
				toSendToAutopilot.custom["string--"+singleUserProfile.fields[i].name.replace(/ /g, "--")] = singleUserProfile.fields[i].value;
			}
		}

		requestDocebo('user/userCourses', {'id_user':id}, function(courses) {
			//console.log(courses);
			//courses = courses.courses;
			/*Course-Id
			Course name
			Course progress
			Date enroll
			Date complete
			Final score
			*/
			var fieldMapping = {"course_id":"id", "course_name":"name", "course_progress" : "progress", "date_enroll":"enroll--date","date_complete":"complete--date","final_score":"final--score"};
			for (var i=1;i<100;i++) {
				if (!(courses["" + i] && courses["" + i].course_info)) break;
				var course = courses["" + i].course_info;
				var prefix = "string--Course-" + (i)+"--";
				for (var key in fieldMapping) {
					toSendToAutopilot.custom[prefix + fieldMapping[key]] = "" + course[key];
				}
			}
			if (toSendToAutopilot.Email) {
			console.log(toSendToAutopilot);
			autopilot.contacts.upsert(toSendToAutopilot)
			.then(function (response) {
				//console.log(response);
				callback();
			})
			} else {
				callback();
			}
 		})







		/*autopilot.contacts.upsert(toSendToAutopilot)
		.then(function (response) {
			console.log(response);
		})*/
	});
}

//requestDocebo('user/fields', {}, function(fields){
//	globalFields = fields;
	requestDocebo('user/listUsers', {}, function(usersList){
		if (usersList.users.length ==0) return;
		var smallCB = function(idx){
			if (idx >= usersList.users.length) return;
			//if (idx == 1) return;
			console.log(usersList.users[idx]);
			processUser(usersList.users[idx].id_user, function(){
				smallCB(idx + 1);
			})
		}
			smallCB(0);
	})
//})


//var contact = { FirstName: 'Bob', LastName: 'Barker', Email: 'bob@bobbarker.com' };
 
/*autopilot.contacts.upsert(contact)
	.then(function (response) {
		console.log(response);
	})
	.catch(function (response) {
		console.log('Error', response);
	});*/
