"""
URL configuration for learning_platform project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from learningplatform.views import CourseListCreateView, CourseDetailView, CourseDetailBySlugView, set_teacher_role, check_user_role, FirebaseLoginView, VerifyFirebaseTokenView, SetTeacherRoleView, UserListView, assign_course, my_courses, teacher_course_detail, health_check, courses_public
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health-check'),
    path('api/courses/public/', courses_public, name='courses-public'),
    path('api/courses/', CourseListCreateView.as_view(), name='course-list-create'),
    path('api/courses/<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('api/courses/slug/<slug:slug>/', CourseDetailBySlugView.as_view(), name='course-detail-by-slug'),
    path('api/users/', UserListView.as_view(), name='user-list'),
    path('api/token-auth/', obtain_auth_token),
    path('api/set-teacher-role/', set_teacher_role, name='set-teacher-role'),
    path('api/set-teacher-role-api/', SetTeacherRoleView.as_view(), name='set-teacher-role-api'),
    path('api/check-user-role/', check_user_role, name='check-user-role'),
    path('api/auth/firebase-login/', FirebaseLoginView.as_view(), name='firebase-login'),
    path('api/assign-course/', assign_course, name='assign-course'),
    path('api/my-courses/', my_courses, name='my-courses'),
    path('api/teacher-course/<int:course_id>/', teacher_course_detail, name='teacher-course-detail'),
]
