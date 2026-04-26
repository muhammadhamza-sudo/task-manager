#!/bin/bash
set -e

echo "Checking for new migrations..."
python manage.py makemigrations --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting server..."
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2
