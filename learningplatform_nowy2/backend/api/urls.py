from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, UserProfileView, LoginViewNoCSRF,
    CategoryViewSet, CourseViewSet, ModuleViewSet, LessonViewSet, ProgressViewSet,
    ParentStudentViewSet, UpdateLearningTimeView
)
from .views.stats import get_user_stats

# Set up DRF router
router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'modules', ModuleViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'progress', ProgressViewSet, basename='progress')
router.register(r'parent-student', ParentStudentViewSet, basename='parent-student')

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login-no-csrf/', LoginViewNoCSRF.as_view(), name='login-no-csrf'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    
    # Learning time endpoint
    path('update-learning-time/', UpdateLearningTimeView.as_view(), name='update-learning-time'),
    
    # Stats endpoints
    path('users/<str:user_id>/stats/', get_user_stats, name='user-stats'),
    
    # Router URLs
    path('', include(router.urls)),
] 
