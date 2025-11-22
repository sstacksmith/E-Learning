from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router zakomentowany - ViewSety nie są zdefiniowane
# router = DefaultRouter()
# router.register(r'users', views.UserViewSet)
# router.register(r'courses', views.CourseViewSet)
# router.register(r'assignments', views.CourseAssignmentViewSet)
# router.register(r'groups', views.UserGroupViewSet)

urlpatterns = [
    # path('', include(router.urls)),
    # path('users/me/', views.CurrentUserView.as_view(), name='current-user'),  # Nie istnieje
    # path('health/', views.health_check, name='health-check'),  # Sprawdź czy istnieje
    # path('courses/public/', views.courses_public, name='courses-public'),  # Sprawdź czy istnieje
    # path('courses/debug/', views.courses_debug, name='courses-debug'),  # Sprawdź czy istnieje
    # path('assign-course/', views.assign_course, name='assign-course'),  # Sprawdź czy istnieje
    # path('teacher-course/<int:course_id>/', views.teacher_course_detail, name='teacher-course-detail'),  # Sprawdź czy istnieje
    
    # Role management endpoints - sprawdź czy istnieją
    # path('api/set-teacher-role-api/', views.set_teacher_role, name='set-teacher-role'),
    # path('api/set-admin-role-api/', views.set_admin_role, name='set-admin-role'),
    # path('api/set-student-role-api/', views.set_student_role, name='set-student-role'),
    
    # 🆕 NOWE ENDPOINTS DLA ZARZĄDZANIA KLASAMI
    # path('classes/create/', views.create_class, name='create-class'),
    # path('classes/list/', views.get_classes, name='get-classes'),
    # path('classes/assign-course/', views.assign_course_to_class, name='assign-course-to-class'),
    # path('classes/add-student/', views.add_student_to_class, name='add-student-to-class'),
    # path('classes/remove-student/', views.remove_student_from_class, name='remove-student-from-class'),
    
    # 🐛 ENDPOINTS DLA ZGŁOSZEŃ BŁĘDÓW
    path('report-bug/', views.report_bug, name='report-bug'),
    path('bug-reports/', views.get_bug_reports, name='get-bug-reports'),
    path('bug-reports/<str:report_id>/status/', views.update_bug_report_status, name='update-bug-report-status'),
]