import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Course, CourseAssignment
from .serializers import CourseSerializer
from firebase_utils import set_user_role, auth
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework.permissions import AllowAny, IsAuthenticated
from .firebase_config import verify_firebase_token
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone

User = get_user_model()

class CourseListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        print(f"GET request to courses by user: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
        courses = Course.objects.all()
        serializer = CourseSerializer(courses, many=True)
        return Response(serializer.data)

    def post(self, request):
        print(f"=== COURSE CREATION ATTEMPT ===")
        print(f"Request method: {request.method}")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request data: {request.data}")
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"User: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
        print(f"User is_teacher: {request.user.is_teacher if request.user.is_authenticated else 'N/A'}")
        print(f"User is_student: {request.user.is_student if request.user.is_authenticated else 'N/A'}")
        print(f"User is_superuser: {request.user.is_superuser if request.user.is_authenticated else 'N/A'}")
        
        if not request.user.is_authenticated:
            print("ERROR: User not authenticated")
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not request.user.is_teacher:
            print("ERROR: User is not a teacher")
            return Response({
                'detail': 'Only teachers can create courses.',
                'user_email': request.user.email,
                'is_teacher': request.user.is_teacher,
                'is_student': request.user.is_student,
                'is_superuser': request.user.is_superuser
            }, status=status.HTTP_403_FORBIDDEN)
        
        print("User is authenticated and is a teacher, proceeding with course creation...")
        
        # Prepare data for serializer
        course_data = request.data.copy()
        course_data['created_by'] = request.user.id
        
        print(f"Course data for serializer: {course_data}")
        
        serializer = CourseSerializer(data=course_data)
        if serializer.is_valid():
            print("Serializer is valid, saving course...")
            course = serializer.save(created_by=request.user)
            print(f"Course created successfully: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print(f"Serializer errors: {serializer.errors}")
            return Response({
                'detail': 'Validation error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

class CourseDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CourseSerializer(course)
        return Response(serializer.data)

class CourseDetailBySlugView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        try:
            course = Course.objects.get(slug=slug)
        except Course.DoesNotExist:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CourseSerializer(course)
        return Response(serializer.data)

@csrf_exempt
def set_student_role(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        uid = data.get('uid')
        if not uid:
            return JsonResponse({'error': 'No UID provided'}, status=400)
        set_user_role(uid, 'student')
        return JsonResponse({'status': 'student role set'})

@staff_member_required
@csrf_exempt
def set_teacher_role(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        uid = data.get('uid')
        if not uid:
            return JsonResponse({'error': 'No UID provided'}, status=400)
        set_user_role(uid, 'teacher')
        return JsonResponse({'status': 'teacher role set'})

@csrf_exempt
def check_user_role(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        uid = data.get('uid')
        if not uid:
            return JsonResponse({'error': 'No UID provided'}, status=400)
        try:
            user = auth.get_user(uid)
            role = user.custom_claims.get('role') if user.custom_claims else None
            return JsonResponse({'uid': uid, 'role': role})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

class FirebaseLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        print('Otrzymany token:', token)
        if not token:
            print('Brak tokena')
            return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

        decoded_token = verify_firebase_token(token)
        print('Decoded token:', decoded_token)
        if not decoded_token:
            print('Token nieprawidłowy')
            return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get or create user
        email = decoded_token.get('email')
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': decoded_token.get('name', '').split()[0] if decoded_token.get('name') else '',
                'last_name': ' '.join(decoded_token.get('name', '').split()[1:]) if decoded_token.get('name') else '',
            }
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}".strip() or user.email
            }
        })

class VerifyFirebaseTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({
            'uid': decoded_token.get('uid'),
            'email': decoded_token.get('email')
        }) 

class SetTeacherRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only allow superusers or existing teachers to set teacher roles
        if not (request.user.is_superuser or request.user.is_teacher):
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Find user by email
            user = User.objects.get(email=email)
            
            # Set teacher role in Django
            user.is_teacher = True
            user.is_student = False
            user.save()
            
            # Set teacher role in Firebase (if we have the UID)
            # Note: This would require the Firebase UID, which we might not have
            # For now, we'll just update the Django user
            
            return Response({
                'detail': f'Successfully set {email} as teacher',
                'user_id': user.id,
                'email': user.email
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Only allow superusers to view all users
        if not request.user.is_superuser:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all()
        user_data = []
        for user in users:
            user_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_teacher': user.is_teacher,
                'is_student': user.is_student,
                'is_superuser': user.is_superuser,
            })
        
        return Response(user_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_course(request):
    course_id = request.data.get('course_id')
    firebase_uid = request.data.get('firebase_uid')
    email = request.data.get('email')
    print(f"assign_course: course_id={course_id}, firebase_uid={firebase_uid}, email={email}")
    if not email:
        return Response({'success': False, 'error': 'Brak email ucznia!'}, status=400)
    try:
        course = Course.objects.get(id=course_id)
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={'username': email.split('@')[0], 'password': '', 'is_student': True}
        )
        assignment, created = CourseAssignment.objects.get_or_create(course=course, student=user, defaults={'assigned_by': request.user, 'is_active': True})
        if not created:
            assignment.is_active = True
            assignment.save()
        course.is_active = True
        course.save()
        return Response({'success': True, 'message': 'Course assigned!'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_courses(request):
    assignments = CourseAssignment.objects.filter(student=request.user, is_active=True)
    courses = [a.course for a in assignments]
    return Response(CourseSerializer(courses, many=True).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_course_detail(request, course_id):
    try:
        course = Course.objects.get(id=course_id)
        assignments = CourseAssignment.objects.filter(course=course)
        assigned_users = [{'id': a.student.id, 'email': a.student.email, 'username': a.student.username, 'is_active': a.is_active} for a in assignments]
        data = CourseSerializer(course).data
        data['assigned_users'] = assigned_users
        return Response(data)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=404) 

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"}) 