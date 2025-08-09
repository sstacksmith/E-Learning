from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, UserProfileView, LoginViewNoCSRF,
    CategoryViewSet, CourseViewSet, ModuleViewSet, LessonViewSet, ProgressViewSet,
    get_user_stats, update_learning_time, enroll_course, get_user_courses, debug_user_courses, test_endpoint, check_lessons, TestEndpoint, import_courses_from_firebase
)

# Set up DRF router
router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
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
    
    # Test endpoints
    path('test/', TestEndpoint.as_view(), name='test'),
    path('check-lessons/', check_lessons, name='check-lessons'),
    path('import-courses/', import_courses_from_firebase, name='import-courses'),
    
    # Stats endpoints
    path('users/<str:user_id>/stats/', get_user_stats, name='user-stats'),
    path('update-learning-time/', update_learning_time, name='update-learning-time'),
    
    # Course management endpoints
    path('enroll-course/', enroll_course, name='enroll-course'),
    path('user-courses/', get_user_courses, name='user-courses'),
    path('debug-user-courses/', debug_user_courses, name='debug-user-courses'),
    
    # Router URLs
    path('', include(router.urls)),
] 
