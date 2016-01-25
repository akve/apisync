var Autopilot = require('autopilot-api');
var autopilot = new Autopilot('8d846eac2979465d964ca9c01316eecd');
var http = require('http');
var sha1 = require('sha1');
var qs = require('querystring');
	var request = require('request');
var fs = require('fs');
//var transforms = require('transformers').getTransforms();

//console.log("!", transforms);

var transforms;

var doceboConfig = {
	key: "k9DafQR8q_!TazjXTO_Tu#7!",
	secret: "8Ewcb!NHluSUAIlh8mI!vhKsB6M1As_2h4_S",
	host: "http://ceu.worldisdm.com/api/"}
 
var rest = require('restler');

var trasnformFields = function(title, value){
//console.log("!", transforms);	
	for (var i=0;i<transforms.length;i++) {
		var fld = transforms[i];
		if (fld.title == title) {
			for (var j=0;j<fld.ids.length;j++) {
				if (fld.ids[j].id == ""+value) {
					return fld.ids[j].val;
				}
			}
		}
	}
	return value; 
}

var putToCache = function(id, content) {
	fs.writeFileSync('cache/' + id + '.json', JSON.stringify(content));
}

var getFromCache = function(id){
	var f = 'cache/' + id + '.json';
	try {
		var s = fs.statSync(f);
		if (s && s.isFile()) {
			var content = fs.readFileSync(f, 'utf8');
			return content;
		} else {
			return 0;
		}
	} catch (e) {
		//console.log(e);
		return 0;
	}
}

var isSameAsInCache = function(id, content) {
	var cached = getFromCache(id);
	//console.log("CACHED", cached);
	//console.log("CONENT", JSON.stringify(content));
	if (getFromCache(id) == JSON.stringify(content)) return true;
	return false;
}

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
				//console.log("!!!", singleUserProfile.fields[i].name);

				toSendToAutopilot.custom["string--"+singleUserProfile.fields[i].name.replace(/ /g, "--")] = trasnformFields(singleUserProfile.fields[i].name, singleUserProfile.fields[i].value);
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
			console.log(new Date(), toSendToAutopilot);
			if (isSameAsInCache(id, toSendToAutopilot)) {
				console.log("::" + id + " NOT CHANGED");
				callback();
			} else {
				console.log("::" + id + " IS CHANGED");
				putToCache(id, toSendToAutopilot);
				autopilot.contacts.upsert(toSendToAutopilot)
				.then(function (response) {
					//console.log(response);
					callback();
				})
			}
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
			/*if (usersList.users[idx].userid != 'WGCarlson') {
				smallCB(idx + 1);
				return;
			}*/
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



'use strict';

transforms = 	[
		{title: 'Choose Your Profession', ids: [	 {id:'252', val:'APLD'}
		,{id:'251', val:'Architecture'}
		,{id:'250', val:'Civil Engineer'}
		,{id:'249', val:'Landscape Architect'}
		,{id:'253" selected="selected', val:'Other'}]},

		{title:'State License #1:', ids: [{id:'156', val:'AK'}
		,{id:'157', val:'AL'}
		,{id:'158', val:'AR'}
		,{id:'159', val:'AZ'}
		,{id:'160', val:'CA'}
		,{id:'161', val:'CO'}
		,{id:'162', val:'CT'}
		,{id:'163', val:'DC'}
		,{id:'164', val:'DE'}
		,{id:'165', val:'FL'}
		,{id:'166', val:'GA'}
		,{id:'167', val:'HI'}
		,{id:'168', val:'IA'}
		,{id:'169', val:'ID'}
		,{id:'170', val:'IL'}
		,{id:'171', val:'IN'}
		,{id:'172', val:'KS'}
		,{id:'173', val:'KY'}
		,{id:'174', val:'LA'}
		,{id:'175', val:'MA'}
		,{id:'176', val:'MD'}
		,{id:'177', val:'ME'}
		,{id:'178', val:'MI'}
		,{id:'179', val:'MN'}
		,{id:'180', val:'MO'}
		,{id:'181', val:'MS'}
		,{id:'182', val:'MT'}
		,{id:'183', val:'NC'}
		,{id:'184', val:'ND'}
		,{id:'185', val:'NE'}
		,{id:'186', val:'NH'}
		,{id:'187', val:'NJ'}
		,{id:'188', val:'NM'}
		,{id:'189', val:'NV'}
		,{id:'190', val:'NY'}
		,{id:'191', val:'OH'}
		,{id:'192', val:'OK'}
		,{id:'193', val:'OR'}
		,{id:'194', val:'PA'}
		,{id:'195', val:'RI'}
		,{id:'196', val:'SC'}
		,{id:'197', val:'SD'}
		,{id:'198', val:'TN'}
		,{id:'199', val:'TX'}
		,{id:'200', val:'UT'}
		,{id:'201', val:'VA'}
		,{id:'202', val:'VT'}
		,{id:'203', val:'WA'}
		,{id:'204', val:'WI'}
		,{id:'205', val:'WV'}
		,{id:'206', val:'WY'}]},

		{title: 'State 2 of License', ids:[{id:'404', val:'AK'}
		,{id:'405', val:'AL'}
		,{id:'406', val:'AR'}
		,{id:'407', val:'AZ'}
		,{id:'408', val:'CA'}
		,{id:'409', val:'CO'}
		,{id:'410', val:'CT'}
		,{id:'411', val:'DC'}
		,{id:'412', val:'DE'}
		,{id:'413', val:'FL'}
		,{id:'414', val:'GA'}
		,{id:'415', val:'HI'}
		,{id:'416', val:'IA'}
		,{id:'417', val:'ID'}
		,{id:'418', val:'IL'}
		,{id:'419', val:'IN'}
		,{id:'420', val:'KS'}
		,{id:'421', val:'KY'}
		,{id:'422', val:'LA'}
		,{id:'423', val:'MA'}
		,{id:'424', val:'MD'}
		,{id:'425', val:'ME'}
		,{id:'426', val:'MI'}
		,{id:'427', val:'MN'}
		,{id:'428', val:'MO'}
		,{id:'429', val:'MS'}
		,{id:'430', val:'MT'}
		,{id:'431', val:'NC'}
		,{id:'432', val:'ND'}
		,{id:'433', val:'NE'}
		,{id:'434', val:'NH'}
		,{id:'435', val:'NJ'}
		,{id:'436', val:'NM'}
		,{id:'437', val:'NV'}
		,{id:'438', val:'NY'}
		,{id:'439', val:'OH'}
		,{id:'440', val:'OK'}
		,{id:'441', val:'OR'}
		,{id:'442', val:'PA'}
		,{id:'443', val:'RI'}
		,{id:'444', val:'SC'}
		,{id:'445', val:'SD'}
		,{id:'446', val:'TN'}
		,{id:'447', val:'TX'}
		,{id:'448', val:'UT'}
		,{id:'449', val:'VA'}
		,{id:'450', val:'VT'}
		,{id:'451', val:'WA'}
		,{id:'452', val:'WI'}
		,{id:'453', val:'WV'}
		,{id:'454', val:'WY'}]},

		{title:'State of Your License 3', ids:[{id:'497', val:'AK'}
		,{id:'498', val:'AL'}
		,{id:'499', val:'AR'}
		,{id:'500', val:'AZ'}
		,{id:'501', val:'CA'}
		,{id:'502', val:'CO'}
		,{id:'503', val:'CT'}
		,{id:'504', val:'DC'}
		,{id:'505', val:'DE'}
		,{id:'506', val:'FL'}
		,{id:'507', val:'GA'}
		,{id:'508', val:'HI'}
		,{id:'509', val:'IA'}
		,{id:'510', val:'ID'}
		,{id:'511', val:'IL'}
		,{id:'512', val:'IN'}
		,{id:'513', val:'KS'}
		,{id:'514', val:'KY'}
		,{id:'515', val:'LA'}
		,{id:'516', val:'MA'}
		,{id:'517', val:'MD'}
		,{id:'518', val:'ME'}
		,{id:'519', val:'MI'}
		,{id:'520', val:'MN'}
		,{id:'521', val:'MO'}
		,{id:'522', val:'MS'}
		,{id:'523', val:'MT'}
		,{id:'524', val:'NC'}
		,{id:'525', val:'ND'}
		,{id:'526', val:'NE'}
		,{id:'527', val:'NH'}
		,{id:'528', val:'NJ'}
		,{id:'529', val:'NM'}
		,{id:'530', val:'NV'}
		,{id:'531', val:'NY'}
		,{id:'532', val:'OH'}
		,{id:'533', val:'OK'}
		,{id:'534', val:'OR'}
		,{id:'535', val:'PA'}
		,{id:'536', val:'RI'}
		,{id:'537', val:'SC'}
		,{id:'538', val:'SD'}
		,{id:'539', val:'TN'}
		,{id:'540', val:'TX'}
		,{id:'541', val:'UT'}
		,{id:'542', val:'VA'}
		,{id:'543', val:'VT'}
		,{id:'544', val:'WA'}
		,{id:'545', val:'WI'}
		,{id:'546', val:'WV'}
		,{id:'547', val:'WY'}]}
	];

