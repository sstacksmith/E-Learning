from django.shortcuts import render, get_object_or_404
from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import authenticate, login, logout, get_user_model
from .serializers import (
    UserRegistrationSerializer, UserSerializer, 
    CategorySerializer, CourseListSerializer, CourseDetailSerializer,
    ModuleSerializer, LessonSerializer, ProgressSerializer
)
from .models import Category, Course, Module, Lesson, Progress
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator

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
