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
import firebase_admin
from firebase_admin import firestore
import logging
import time

# Konfiguracja logowania
logger = logging.getLogger(__name__)

User = get_user_model()

def sync_course_to_firestore(course, operation='create'):
    """
    Synchronizuje kurs z Firestore
    """
    try:
        db = firestore.client()
        course_ref = db.collection('courses').document(str(course.id))
        
        # Przygotuj dane do zapisu
        course_data = {
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'year_of_study': course.year_of_study,
            'subject': course.subject or '',
            'is_active': course.is_active,
            'created_by': course.created_by.id,
            'created_at': course.created_at.isoformat(),
            'updated_at': course.updated_at.isoformat(),
            'pdfUrls': course.pdfUrls or [],
            'links': course.links or [],
            'slug': course.slug or '',
            'assignedUsers': [],
            'sections': []  # Dodajemy sekcje dla kompatybilności z frontendem
        }
        
        # Usuń None wartości
        course_data = {k: v for k, v in course_data.items() if v is not None}
        
        if operation == 'create':
            course_ref.set(course_data)
            logger.info(f"Course created in Firestore: {course.id}")
        elif operation == 'update':
            course_ref.set(course_data, merge=True)
            logger.info(f"Course updated in Firestore: {course.id}")
        elif operation == 'delete':
            course_ref.delete()
            logger.info(f"Course deleted from Firestore: {course.id}")
            
        return True
    except Exception as e:
        logger.error(f"Error synchronizing course with Firestore: {e}")
        return False

class CourseListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        print(f"GET request to courses by user: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
        print(f"User ID: {request.user.id}")
        print(f"User is_teacher: {request.user.is_teacher}")
        print(f"User is_superuser: {request.user.is_superuser}")
        print(f"User is_student: {request.user.is_student}")
        
        # Filtruj kursy na podstawie roli użytkownika
        if request.user.is_teacher:
            # Nauczyciele widzą tylko swoje kursy
            courses = Course.objects.filter(created_by=request.user).order_by('-created_at')
            print(f"Teacher filtering: found {courses.count()} courses for teacher {request.user.email}")
            for course in courses:
                print(f"  - Course: {course.title} (ID: {course.id}) created by: {course.created_by.email}")
        elif request.user.is_superuser:
            # Administratorzy widzą wszystkie kursy
            courses = Course.objects.all().order_by('-created_at')
            print(f"Superuser: found {courses.count()} total courses")
        else:
            # Studenci widzą tylko kursy do których są przypisani
            from learningplatform.models import CourseAssignment
            assignments = CourseAssignment.objects.filter(student=request.user, is_active=True)
            course_ids = [assignment.course.id for assignment in assignments]
            courses = Course.objects.filter(id__in=course_ids).order_by('-created_at')
            print(f"Student: found {courses.count()} assigned courses")
        
        # Dodaj paginację dla lepszej wydajności
        page = self.request.query_params.get('page', 1)
        page_size = self.request.query_params.get('page_size', 20)
        
        try:
            page = int(page)
            page_size = int(page_size)
        except ValueError:
            page = 1
            page_size = 20
        
        # Ogranicz page_size do rozsądnej wartości
        page_size = min(page_size, 50)
        
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_courses = courses[start:end]
        serializer = CourseSerializer(paginated_courses, many=True)
        
        response_data = {
            'results': serializer.data,
            'count': courses.count(),
            'page': page,
            'page_size': page_size,
            'total_pages': (courses.count() + page_size - 1) // page_size
        }
        
        return Response(response_data)

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
            
            # Synchronize with Firestore
            sync_success = sync_course_to_firestore(course, 'create')
            if not sync_success:
                print("Warning: Course created in Django but failed to sync with Firestore")
            
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

    def put(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CourseSerializer(course, data=request.data)
        if serializer.is_valid():
            course = serializer.save()
            
            # Synchronize with Firestore
            sync_success = sync_course_to_firestore(course, 'update')
            if not sync_success:
                print("Warning: Course updated in Django but failed to sync with Firestore")
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CourseSerializer(course, data=request.data, partial=True)
        if serializer.is_valid():
            course = serializer.save()
            
            # Synchronize with Firestore
            sync_success = sync_course_to_firestore(course, 'update')
            if not sync_success:
                print("Warning: Course patched in Django but failed to sync with Firestore")
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete from Firestore first
        sync_success = sync_course_to_firestore(course, 'delete')
        if not sync_success:
            print("Warning: Failed to delete course from Firestore")
        
        # Delete from Django
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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

@staff_member_required
@csrf_exempt
def set_admin_role(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        uid = data.get('uid')
        if not uid:
            return JsonResponse({'error': 'No UID provided'}, status=400)
        set_user_role(uid, 'admin')
        return JsonResponse({'status': 'admin role set'})

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
        # Allow all authenticated users to view users (needed for chat participants)
        # This is safe because we only return basic user info needed for chat functionality
        
        users = User.objects.all()
        user_data = []
        for user in users:
            user_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'firebase_uid': user.firebase_uid or '',
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'role': 'teacher' if user.is_teacher else 'student',
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
        # Pracuj bezpośrednio z Firestore
        db = firestore.client()
        course_ref = db.collection('courses').document(str(course_id))
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return Response({'success': False, 'error': 'Kurs nie został znaleziony w Firestore!'}, status=404)
        
        # Pobierz aktualne dane kursu
        current_data = course_doc.to_dict()
        assigned_users = current_data.get('assignedUsers', [])
        
        # Dodaj użytkownika jeśli nie istnieje
        user_identifier = firebase_uid if firebase_uid else email
        if user_identifier not in assigned_users:
            assigned_users.append(user_identifier)
            
            # Zaktualizuj kurs w Firestore
            course_ref.update({
                'assignedUsers': assigned_users,
                'updated_at': timezone.now().isoformat()
            })
            
            print(f"User {user_identifier} assigned to course {course_id} in Firestore")
            logger.info(f"User {user_identifier} assigned to course {course_id}")
            
            return Response({
                'success': True, 
                'message': 'Uczeń został przypisany do kursu!',
                'assigned_users': assigned_users
            })
        else:
            return Response({
                'success': True, 
                'message': 'Uczeń jest już przypisany do tego kursu!',
                'assigned_users': assigned_users
            })
            
    except Exception as e:
        print(f"Error in assign_course: {e}")
        logger.error(f"Error in assign_course: {e}")
        return Response({
            'success': False, 
            'error': f'Błąd przypisywania ucznia: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)

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
        # Pobierz dane kursu z Firestore
        db = firestore.client()
        course_ref = db.collection('courses').document(str(course_id))
        course_doc = course_ref.get()
        
        if not course_doc.exists:
            return Response({'error': 'Kurs nie został znaleziony w Firestore!'}, status=404)
        
        firestore_data = course_doc.to_dict()
        
        # Przygotuj dane kursu
        course_data = {
            'id': firestore_data.get('id', course_id),
            'title': firestore_data.get('title', 'Kurs bez tytułu'),
            'description': firestore_data.get('description', 'Brak opisu'),
            'year_of_study': firestore_data.get('year_of_study', 1),
            'subject': firestore_data.get('subject', 'Ogólny'),
            'is_active': firestore_data.get('is_active', True),
            'created_at': firestore_data.get('created_at', ''),
            'updated_at': firestore_data.get('updated_at', ''),
            'pdfUrls': firestore_data.get('pdfUrls', []),
            'links': firestore_data.get('links', []),
            'slug': firestore_data.get('slug', ''),
            'sections': firestore_data.get('sections', [])
        }
        
        # Pobierz przypisanych użytkowników
        assigned_users = firestore_data.get('assignedUsers', [])
        
        # Przygotuj dane przypisanych użytkowników
        assigned_users_data = []
        for user_identifier in assigned_users:
            assigned_users_data.append({
                'id': user_identifier,  # Używamy identyfikatora jako ID
                'email': user_identifier if '@' in str(user_identifier) else f'{user_identifier}@example.com',
                'username': user_identifier.split('@')[0] if '@' in str(user_identifier) else user_identifier,
                'first_name': '',
                'last_name': '',
                'is_active': True,
                'assigned_date': firestore_data.get('updated_at', ''),
                'assigned_by': 'Nauczyciel'
            })
        
        # Przygotuj odpowiedź
        response_data = {
            **course_data,
            'assigned_users': assigned_users_data,
            'total_students': len(assigned_users_data),
            'firestore_assigned_users': assigned_users,
            'firestore_sections': firestore_data.get('sections', [])
        }
        
        print(f"Teacher course detail for course {course_id}:")
        print(f"  - Assigned users: {assigned_users}")
        print(f"  - Total students: {len(assigned_users_data)}")
        print(f"  - Course data: {course_data}")
        
        return Response(response_data)
        
    except Exception as e:
        print(f"Error in teacher_course_detail: {e}")
        logger.error(f"Error in teacher_course_detail: {e}")
        return Response({
            'error': f'Błąd pobierania szczegółów kursu: {str(e)}'
        }, status=500) 

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'timestamp': time.time()})

@api_view(['GET'])
@permission_classes([AllowAny])
def courses_public(request):
    """Publiczny endpoint do testowania kursów bez autoryzacji"""
    try:
        courses = Course.objects.filter(is_active=True).order_by('-created_at')[:10]
        serializer = CourseSerializer(courses, many=True)
        return Response({
            'results': serializer.data,
            'count': courses.count(),
            'message': 'Public courses endpoint'
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def courses_debug(request):
    """Endpoint do debugowania - pokazuje wszystkie kursy"""
    try:
        all_courses = Course.objects.all().order_by('-created_at')
        courses_data = []
        
        for course in all_courses:
            courses_data.append({
                'id': course.id,
                'title': course.title,
                'created_by': course.created_by.email if course.created_by else 'Unknown',
                'created_by_id': course.created_by.id if course.created_by else None,
                'created_at': course.created_at.isoformat(),
                'is_active': course.is_active,
                'subject': course.subject,
                'year_of_study': course.year_of_study
            })
        
        return Response({
            'results': courses_data,
            'count': len(courses_data),
            'message': 'Debug endpoint - all courses'
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500) 