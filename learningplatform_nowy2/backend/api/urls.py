from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, UserProfileView, LoginViewNoCSRF,
    CategoryViewSet, CourseViewSet, ModuleViewSet, LessonViewSet, ProgressViewSet
)

# Set up DRF router
router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
# router.register(r'courses', CourseViewSet)  # Removed to avoid endpoint conflict
router.register(r'modules', ModuleViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'progress', ProgressViewSet, basename='progress')

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login-no-csrf/', LoginViewNoCSRF.as_view(), name='login-no-csrf'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    
    # Router URLs
    path('', include(router.urls)),
] 