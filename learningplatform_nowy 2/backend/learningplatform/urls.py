from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'courses', views.CourseViewSet)
router.register(r'assignments', views.CourseAssignmentViewSet)
router.register(r'groups', views.UserGroupViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
]