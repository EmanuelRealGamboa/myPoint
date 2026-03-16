"""
URL Configuration for Users and Authentication
"""
from django.urls import path
from .views import (
    LoginView,
    CustomTokenRefreshView,
    UserProfileView,
    RequestUnlockView,
    AdminUnlockView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    LockedAccountsView,
    LoginAuditLogView,
    AdminDashboardSummaryView,
    UserListCreateView,
    UserDetailView,
    TurnoListCreateView,
    TurnoDetailView,
)

app_name = 'users'

urlpatterns = [
    # Auth
    path('login/',   LoginView.as_view(),              name='login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(),        name='profile'),

    # Security: account lockout & password reset (all public)
    path('request-unlock/',          RequestUnlockView.as_view(),        name='request_unlock'),
    path('admin/unlock/<int:pk>/',   AdminUnlockView.as_view(),          name='admin_unlock'),
    path('password-reset/',          PasswordResetRequestView.as_view(),  name='password_reset_request'),
    path('password-reset/confirm/',  PasswordResetConfirmView.as_view(),  name='password_reset_confirm'),

    # Security: admin monitoring (admin only)
    path('locked-accounts/', LockedAccountsView.as_view(),   name='locked_accounts'),
    path('audit-log/',       LoginAuditLogView.as_view(),     name='audit_log'),

    # Dashboard (ADMINISTRATOR + ENCARGADO)
    path('admin/dashboard/summary/', AdminDashboardSummaryView.as_view(), name='admin_dashboard'),

    # User management (ADMINISTRATOR + ENCARGADO scoped)
    path('users/',          UserListCreateView.as_view(), name='user_list_create'),
    path('users/<int:pk>/', UserDetailView.as_view(),     name='user_detail'),

    # Turno / schedule management (ADMINISTRATOR + ENCARGADO scoped)
    path('turnos/',          TurnoListCreateView.as_view(), name='turno_list_create'),
    path('turnos/<int:pk>/', TurnoDetailView.as_view(),     name='turno_detail'),
]
