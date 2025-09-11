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
    
    # Role management endpoints
    path('api/set-teacher-role-api/', views.set_teacher_role, name='set-teacher-role'),
    path('api/set-admin-role-api/', views.set_admin_role, name='set-admin-role'),
    path('api/set-student-role-api/', views.set_student_role, name='set-student-role'),
    
    # 🆕 NOWE ENDPOINTS DLA ZARZĄDZANIA KLASAMI
    path('classes/create/', views.create_class, name='create-class'),
    path('classes/list/', views.get_classes, name='get-classes'),
    path('classes/assign-course/', views.assign_course_to_class, name='assign-course-to-class'),
    path('classes/add-student/', views.add_student_to_class, name='add-student-to-class'),
    path('classes/remove-student/', views.remove_student_from_class, name='remove-student-from-class'),
]