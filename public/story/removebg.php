<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$API_KEY = "rvAXVPrU9KSmk3wxQUYPni8U";

if (!isset($_GET["image_url"])) {
  http_response_code(400);
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode(["error" => "missing image_url"]);
  exit;
}

$imageUrl = $_GET["image_url"];

$ch = curl_init("https://api.remove.bg/v1.0/removebg");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-Api-Key: ".$API_KEY]);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
  "image_url" => $imageUrl,
  "size" => "auto"
]);

$response = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http >= 200 && $http < 300) {
  header("Content-Type: image/png");
  echo $response;
  exit;
}

// Mostra o erro real da API:
http_response_code($http);
header("Content-Type: application/json; charset=utf-8");
echo json_encode(["removebg_http" => $http, "removebg_body" => $response], JSON_UNESCAPED_UNICODE);
