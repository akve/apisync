<?php
/**
* DOCEBO, e-learning SAAS
*
* @link http://www.docebo.com/
* @copyright Copyright &copy; 2004-2013 Docebo
*/
class Api {
static public $url = 'ceu.worldisdm.com';
static public $key = 'k9DafQR8q_!TazjXTO_Tu#7!';
static public $secret_key = '8Ewcb!NHluSUAIlh8mI!vhKsB6M1As_2h4_S';
static public $sso = 'your_toekn_from_api_app';
static public function getHash($params) {
$res =array('sha1'=>'', 'x_auth'=>'');
$res['sha1']=sha1(implode(',', $params) . ',' . self::$secret_key);
$res['x_auth']=base64_encode(self::$key . ':' . $res['sha1']);
echo $res['x_auth'];
return $res;
}
static private function getDefaultHeader($x_auth) {
return array(
"Host: " . self::$url,
"Content-Type: multipart/form-data",
'X-Authorization: Docebo '.$x_auth,
);
}
static public function call($action, $data_params) {
$curl = curl_init();
$hash_info = self::getHash($data_params);
$http_header =self::getDefaultHeader($hash_info['x_auth']);
$opt = array(
CURLOPT_URL=>self::$url . '/api/' . $action,
CURLOPT_RETURNTRANSFER=>1,
CURLOPT_HTTPHEADER=>$http_header,
CURLOPT_POST=>1,
CURLOPT_POSTFIELDS=>$data_params,
CURLOPT_CONNECTTIMEOUT=>5, // Timeout to 5 seconds
);
curl_setopt_array($curl, $opt);
// $output contains the output string
$output = curl_exec($curl);
// it closes the session
curl_close($curl);
echo $output;
return $output;}
}
// sample call
$res = API::call('user/profile', array(
'id_user' => '13258'
));