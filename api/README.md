# API Directory - Do not delete

This folder contains the PHP backend API.

## Files

- `config.php` - Database and Pusher configuration
- `db.php` - Database connection helper
- `pusher.php` - Pusher integration
- `helpers.php` - Utility functions
- `sessions.php` - Session management API
- `questions.php` - Questions API
- `responses.php` - Responses API
- `participants.php` - Participants API
- `schema.sql` - MySQL database schema

## Setup on cPanel

1. Upload all files to `public_html/api/`
2. Edit `config.php` with your MySQL credentials
3. Import `schema.sql` via phpMyAdmin
