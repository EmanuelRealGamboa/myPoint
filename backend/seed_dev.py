"""
Script de datos de prueba para desarrollo.
Crea una sede y un usuario por cada rol.

Uso:
    python manage.py shell < seed_dev.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from branches.models import Sede
from users.models import CustomUser

# ── Sede de prueba ────────────────────────────────────────────────────────────
sede, created = Sede.objects.get_or_create(
    name='Sucursal Central',
    defaults={
        'address': 'Av. Moto 100, Col. Centro',
        'phone': '555-0001',
    }
)
print(f"{'Sede creada' if created else 'Sede ya existía'}: {sede.name}")

# ── Usuarios por rol ──────────────────────────────────────────────────────────
USERS = [
    {
        'email': 'admin@motoqfox.com',
        'first_name': 'Admin',
        'last_name': 'Sistema',
        'role': CustomUser.Role.ADMINISTRATOR,
        'sede': None,
        'password': 'Admin1234!',
    },
    {
        'email': 'worker@motoqfox.com',
        'first_name': 'Carlos',
        'last_name': 'Mecánico',
        'role': CustomUser.Role.WORKER,
        'sede': sede,
        'password': 'Worker1234!',
    },
    {
        'email': 'cashier@motoqfox.com',
        'first_name': 'María',
        'last_name': 'Cajera',
        'role': CustomUser.Role.CASHIER,
        'sede': sede,
        'password': 'Cashier1234!',
    },
    {
        'email': 'customer@motoqfox.com',
        'first_name': 'Luis',
        'last_name': 'Cliente',
        'role': CustomUser.Role.CUSTOMER,
        'sede': None,
        'password': 'Customer1234!',
    },
]

for u in USERS:
    password = u.pop('password')
    obj, created = CustomUser.objects.get_or_create(
        email=u['email'],
        defaults=u
    )
    if created:
        obj.set_password(password)
        obj.save()
        print(f"  [OK]  [{obj.role:15}] {obj.email}  pass: {password}")
    else:
        print(f"  · Existe  [{obj.role:15}] {obj.email}")

print("\n¡Listo! Credenciales de prueba:")
print("  admin@motoqfox.com    / Admin1234!    → /admin")
print("  worker@motoqfox.com   / Worker1234!   → /worker")
print("  cashier@motoqfox.com  / Cashier1234!  → /cashier")
print("  customer@motoqfox.com / Customer1234! → (sin panel)")
