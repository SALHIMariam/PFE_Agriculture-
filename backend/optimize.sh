#!/bin/bash
cd "$(dirname "$0")"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
composer dump-autoload --optimize
