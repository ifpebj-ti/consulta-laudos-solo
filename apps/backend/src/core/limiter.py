from slowapi import Limiter
from slowapi.util import get_remote_address

# Limiter central baseado em IP do cliente
limiter = Limiter(key_func=get_remote_address)
