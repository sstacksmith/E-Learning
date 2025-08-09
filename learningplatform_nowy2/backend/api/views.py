from django.shortcuts import render, get_object_or_404
from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import authenticate, login, logout, get_user_model
from .serializers import (
    UserRegistrationSerializer, UserSerializer, 
    CategorySerializer, CourseListSerializer, CourseDetailSerializer,
    ModuleSerializer, LessonSerializer, ProgressSerializer, ParentStudentSerializer
)
from .models import Category, Course, Module, Lesson, Progress, ParentStudent
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.db.models import Q

User = get_user_model()

# Create your views here.

class RegisterView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "User has been registered successfully",
                "user": UserSerializer(serializer.instance).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"Login attempt with username: {username}")
        
        # Login will work with either username or email
        user = None
        
        # First try standard username authentication
        user = authenticate(username=username, password=password)
        
        # If that doesn't work, check if it's an email
        if not user and '@' in username:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                print(f"No user with email {username}")
                pass
        
        if user:
            print(f"Login successful for user: {user.username}")
            login(request, user)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        
        # If login failed with the provided credentials, check if the user exists at all
        try:
            if User.objects.filter(username=username).exists():
                print(f"User {username} exists but password is incorrect")
                return Response(
                    {"error": "Password is incorrect."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            print(f"Error checking for username: {e}")
            
        print(f"Login failed - invalid credentials")
        return Response(
            {"error": "Invalid credentials. Please check your username/email and password."},
            status=status.HTTP_401_UNAUTHORIZED
        )

@method_decorator(csrf_exempt, name='dispatch')
class LoginViewNoCSRF(APIView):
    """A view that completely bypasses CSRF for login."""
    permission_classes = (permissions.AllowAny,)
    authentication_classes = []  # Remove all authentication

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"No-CSRF login attempt with username: {username}")
        
        if username and password:
            # First try standard username authentication
            user = authenticate(username=username, password=password)
            
            # If that doesn't work, check if it's an email
            if not user and '@' in username:
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass
            
            if user:
                print(f"User authenticated: {user.username}")
                print(f"User flags - is_superuser: {user.is_superuser}, is_teacher: {user.is_teacher}, is_student: {user.is_student}")
                
                # Determine user type based on flags
                user_type = 'admin' if user.is_superuser else 'teacher' if user.is_teacher else 'student'
                print(f"User type determined: {user_type}")
                
                user_data = {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_student": user.is_student,
                    "is_teacher": user.is_teacher,
                    "user_type": user_type
                }
                print(f"Final user data being sent: {user_data}")
                return Response(user_data)
            
            print(f"No-CSRF login failed for: {username}")
            return Response(
                {"error": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Successfully logged out"})

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

# Course related views

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.all()
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description', 'category__name']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured_courses = Course.objects.filter(is_featured=True)
        serializer = CourseListSerializer(featured_courses, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category_id = request.query_params.get('category_id')
        if category_id:
            courses = Course.objects.filter(category_id=category_id)
            serializer = CourseListSerializer(courses, many=True)
            return Response(serializer.data)
        return Response({"error": "category_id parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        course_id = self.request.query_params.get('course_id')
        if course_id:
            return Module.objects.filter(course_id=course_id)
        return Module.objects.all()

class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        module_id = self.request.query_params.get('module_id')
        if module_id:
            return Lesson.objects.filter(module_id=module_id)
        return Lesson.objects.all()

class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Progress.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_completed(self, request):
        lesson_id = request.data.get('lesson_id')
        if not lesson_id:
            return Response({"error": "lesson_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        lesson = get_object_or_404(Lesson, id=lesson_id)
        progress, created = Progress.objects.get_or_create(
            user=request.user,
            lesson=lesson,
            defaults={'completed': True}
        )
        
        if not created:
            progress.completed = True
            progress.save()
        
        return Response({"message": "Lesson marked as completed"}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def course_progress(self, request):
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response({"error": "course_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        course = get_object_or_404(Course, id=course_id)
        modules = Module.objects.filter(course=course)
        result = []
        
        for module in modules:
            lessons = Lesson.objects.filter(module=module)
            lesson_progress = []
            
            for lesson in lessons:
                try:
                    progress = Progress.objects.get(user=request.user, lesson=lesson)
                    completed = progress.completed
                except Progress.DoesNotExist:
                    completed = False
                
                lesson_progress.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'completed': completed
                })
            
            result.append({
                'id': module.id,
                'title': module.title,
                'lessons': lesson_progress
            })
        
        return Response(result)

class ParentStudentViewSet(viewsets.ModelViewSet):
    serializer_class = ParentStudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return ParentStudent.objects.all()
        elif user.is_parent:
            return ParentStudent.objects.filter(parent=user)
        return ParentStudent.objects.none()

    def perform_create(self, serializer):
        serializer.save(parent=self.request.user)

    @action(detail=False, methods=['get'])
    def available_students(self, request):
        # Get all students that are not already assigned to this parent
        assigned_students = ParentStudent.objects.filter(parent=request.user).values_list('student_id', flat=True)
        available_students = User.objects.filter(is_student=True).exclude(id__in=assigned_students)
        return Response(UserSerializer(available_students, many=True).data)

    @action(detail=False, methods=['get'])
    def my_students_progress(self, request):
        if not request.user.is_parent:
            return Response({"error": "Only parents can access this endpoint"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all students assigned to this parent
        student_relationships = ParentStudent.objects.filter(parent=request.user)
        
        progress_data = []
        for relationship in student_relationships:
            student = relationship.student
            student_progress = Progress.objects.filter(user=student)
            
            # Get all courses the student is enrolled in
            courses = Course.objects.filter(students=student)
            
            courses_data = []
            for course in courses:
                # Calculate course progress
                total_lessons = Lesson.objects.filter(module__course=course).count()
                completed_lessons = Progress.objects.filter(
                    user=student,
                    lesson__module__course=course,
                    completed=True
                ).count()
                
                progress_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
                
                courses_data.append({
                    'course_id': course.id,
                    'course_title': course.title,
                    'progress_percentage': round(progress_percentage, 2),
                    'completed_lessons': completed_lessons,
                    'total_lessons': total_lessons
                })
            
            progress_data.append({
                'student_id': student.id,
                'student_name': student.username,
                'student_email': student.email,
                'courses': courses_data
            })
        
        return Response(progress_data)

    @action(detail=False, methods=['get'])
    def my_students_grades(self, request):
        if not request.user.is_parent:
            return Response({"error": "Only parents can access this endpoint"}, status=status.HTTP_403_FORBIDDEN)
        
        student_relationships = ParentStudent.objects.filter(parent=request.user)
        grades_data = []
        
        for relationship in student_relationships:
            student = relationship.student
            grades = Grade.objects.filter(student=student).order_by('-date')
            
            grades_list = []
            for grade in grades:
                grades_list.append({
                    'course_title': grade.course.title,
                    'grade': grade.value,
                    'date': grade.date
                })
            
            grades_data.append({
                'student_id': student.id,
                'student_name': student.username,
                'student_email': student.email,
                'grades': grades_list
            })
        
        return Response(grades_data)

    @action(detail=False, methods=['get'])
    def my_students_courses(self, request):
        if not request.user.is_parent:
            return Response({"error": "Only parents can access this endpoint"}, status=status.HTTP_403_FORBIDDEN)
        
        student_relationships = ParentStudent.objects.filter(parent=request.user)
        courses_data = []
        
        for relationship in student_relationships:
            student = relationship.student
            courses = Course.objects.filter(students=student)
            
            courses_list = []
            for course in courses:
                courses_list.append({
                    'course_id': course.id,
                    'course_title': course.title,
                    'description': course.description,
                    'teacher_name': course.teacher.username,
                    'enrollment_date': course.created_at
                })
            
            courses_data.append({
                'student_id': student.id,
                'student_name': student.username,
                'student_email': student.email,
                'courses': courses_list
            })
        
        return Response(courses_data)
