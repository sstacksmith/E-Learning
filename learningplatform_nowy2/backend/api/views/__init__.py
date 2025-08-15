# Import all views from the main_views module and stats module
from ..main_views import (
    RegisterView, LoginView, LogoutView, UserProfileView, LoginViewNoCSRF,
    CategoryViewSet, CourseViewSet, ModuleViewSet, LessonViewSet, ProgressViewSet,
    ParentStudentViewSet, UpdateLearningTimeView
)

# Import additional modules
from .stats import get_user_stats
