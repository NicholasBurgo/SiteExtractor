from fastapi import Depends
from core.config import settings

def get_settings():
    return settings

