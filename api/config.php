<?php
/**
 * Database and Pusher Configuration
 * Update these values for your cPanel hosting
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'luniazyy_quiz');
define('DB_USER', 'luniazyy_quiz');
define('DB_PASS', 'KTQr5zCkVzktRcPEWfpf');

// Pusher Configuration
define('PUSHER_APP_ID', '2112762');
define('PUSHER_KEY', '1aaf0b4792f2a1ffd6fa');
define('PUSHER_SECRET', '4af8c24bed865d358c94');
define('PUSHER_CLUSTER', 'ap2');

// CORS - Update with your domain
define('CORS_ORIGIN', '*');  // Change to your domain in production

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set timezone
date_default_timezone_set('Africa/Johannesburg');
