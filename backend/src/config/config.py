import os
from datetime import timedelta

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set in environment variables")
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("No DATABASE_URL set in environment variables")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("No JWT_SECRET_KEY set in environment variables")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', '1')))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', '30')))
    
    # Application Settings
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    TESTING = os.environ.get('FLASK_ENV') == 'testing'