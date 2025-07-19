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
    path('health/', views.health_check, name='health-check'),
    path('courses/public/', views.courses_public, name='courses-public'),
    path('courses/debug/', views.courses_debug, name='courses-debug'),
    path('assign-course/', views.assign_course, name='assign-course'),
    path('teacher-course/<int:course_id>/', views.teacher_course_detail, name='teacher-course-detail'),
]