#!/bin/bash

# Lancer le scheduler en arrière-plan
php artisan schedule:work &

# Lancer le serveur
php artisan serve --host=0.0.0.0 --port=8000
