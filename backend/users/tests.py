"""
Unit tests for User Management (Fase 2)
Run: python manage.py test users
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from branches.models import Sede
from .models import CustomUser


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def make_sede(name='Sede Central', address='Calle 1'):
    return Sede.objects.create(name=name, address=address)


def make_user(email, role, sede=None, password='Test1234!', **kwargs):
    return CustomUser.objects.create_user(
        email=email,
        password=password,
        first_name='Test',
        last_name='User',
        role=role,
        sede=sede,
        **kwargs
    )


class UserListCreateViewTests(TestCase):
    """
    Tests for:
      GET  /api/auth/users/  — list users (ADMINISTRATOR only)
      POST /api/auth/users/  — create user (ADMINISTRATOR only)
    """

    def setUp(self):
        self.client = APIClient()
        self.sede = make_sede()
        self.admin = make_user('admin@test.com', CustomUser.Role.ADMINISTRATOR)
        self.worker = make_user('worker@test.com', CustomUser.Role.WORKER, sede=self.sede)
        self.url = '/api/auth/users/'

    # ── GET ──────────────────────────────────

    def test_list_users_as_admin_returns_200(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('users', response.data['data'])
        self.assertIn('pagination', response.data['data'])

    def test_list_users_as_worker_returns_403(self):
        self.client.force_authenticate(user=self.worker)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_users_unauthenticated_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_users_filter_by_role(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {'role': 'WORKER'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        users = response.data['data']['users']
        for u in users:
            self.assertEqual(u['role'], 'WORKER')

    def test_list_users_filter_by_sede(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {'sede_id': self.sede.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        users = response.data['data']['users']
        for u in users:
            self.assertEqual(u['sede']['id'], self.sede.pk)

    def test_list_users_filter_by_is_active_false(self):
        inactive = make_user('inactive@test.com', CustomUser.Role.WORKER,
                             sede=self.sede, is_active=False)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {'is_active': 'false'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u['email'] for u in response.data['data']['users']]
        self.assertIn(inactive.email, emails)
        self.assertNotIn(self.admin.email, emails)

    def test_list_users_search_by_email(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {'search': 'worker'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u['email'] for u in response.data['data']['users']]
        self.assertIn('worker@test.com', emails)

    def test_list_users_pagination(self):
        # Create extra users so we can test page_size
        for i in range(5):
            make_user(f'extra{i}@test.com', CustomUser.Role.CUSTOMER)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {'page_size': 3, 'page': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(len(data['users']), 3)
        self.assertEqual(data['pagination']['page_size'], 3)

    # ── POST ─────────────────────────────────

    def test_create_customer_without_sede_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'newcustomer@test.com',
            'first_name': 'New',
            'last_name': 'Customer',
            'role': 'CUSTOMER',
            'password': 'Test1234!',
            'password_confirm': 'Test1234!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

    def test_create_worker_without_sede_fails(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'noworker@test.com',
            'first_name': 'No',
            'last_name': 'Sede',
            'role': 'WORKER',
            'password': 'Test1234!',
            'password_confirm': 'Test1234!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sede', response.data['errors'])

    def test_create_worker_with_sede_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'newworker@test.com',
            'first_name': 'New',
            'last_name': 'Worker',
            'role': 'WORKER',
            'sede': self.sede.pk,
            'password': 'Test1234!',
            'password_confirm': 'Test1234!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_cashier_without_sede_fails(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'nocashier@test.com',
            'first_name': 'No',
            'last_name': 'Sede',
            'role': 'CASHIER',
            'password': 'Test1234!',
            'password_confirm': 'Test1234!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_password_mismatch_fails(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'mismatch@test.com',
            'first_name': 'X',
            'last_name': 'Y',
            'role': 'CUSTOMER',
            'password': 'Test1234!',
            'password_confirm': 'Different!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_duplicate_email_fails(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'admin@test.com',  # already exists
            'first_name': 'Dup',
            'last_name': 'User',
            'role': 'CUSTOMER',
            'password': 'Test1234!',
            'password_confirm': 'Test1234!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_user_as_worker_returns_403(self):
        self.client.force_authenticate(user=self.worker)
        payload = {
            'email': 'attempt@test.com',
            'first_name': 'X',
            'last_name': 'Y',
            'role': 'CUSTOMER',
            'password': 'Test1234!',
            'password_confirm': 'Test1234!',
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserDetailViewTests(TestCase):
    """
    Tests for:
      GET    /api/auth/users/<id>/  — retrieve detail (ADMINISTRATOR only)
      PUT    /api/auth/users/<id>/  — update user    (ADMINISTRATOR only)
      DELETE /api/auth/users/<id>/  — toggle active  (ADMINISTRATOR only)
    """

    def setUp(self):
        self.client = APIClient()
        self.sede = make_sede()
        self.admin = make_user('admin@test.com', CustomUser.Role.ADMINISTRATOR)
        self.worker = make_user('worker@test.com', CustomUser.Role.WORKER, sede=self.sede)
        self.target = make_user('target@test.com', CustomUser.Role.CUSTOMER)
        self.url = f'/api/auth/users/{self.target.pk}/'

    # ── GET ──────────────────────────────────

    def test_get_user_detail_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['email'], 'target@test.com')

    def test_get_user_detail_as_worker_returns_403(self):
        self.client.force_authenticate(user=self.worker)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_nonexistent_user_returns_404(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/users/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── PUT ──────────────────────────────────

    def test_update_user_name(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(self.url, {'first_name': 'Updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.first_name, 'Updated')

    def test_update_role_to_worker_without_sede_fails(self):
        self.client.force_authenticate(user=self.admin)
        # target has no sede; trying to change role to WORKER should fail
        response = self.client.put(self.url, {'role': 'WORKER'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sede', response.data['errors'])

    def test_update_role_to_worker_with_sede_succeeds(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(
            self.url,
            {'role': 'WORKER', 'sede': self.sede.pk},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.role, CustomUser.Role.WORKER)

    def test_update_user_as_worker_returns_403(self):
        self.client.force_authenticate(user=self.worker)
        response = self.client.put(self.url, {'first_name': 'X'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── DELETE (toggle active) ────────────────

    def test_deactivate_user(self):
        self.client.force_authenticate(user=self.admin)
        self.assertTrue(self.target.is_active)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)
        self.assertIn('desactivado', response.data['message'])

    def test_reactivate_user(self):
        self.target.is_active = False
        self.target.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)
        self.assertIn('activado', response.data['message'])

    def test_cannot_deactivate_self(self):
        self.client.force_authenticate(user=self.admin)
        self_url = f'/api/auth/users/{self.admin.pk}/'
        response = self.client.delete(self_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)  # unchanged

    def test_delete_as_worker_returns_403(self):
        self.client.force_authenticate(user=self.worker)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
