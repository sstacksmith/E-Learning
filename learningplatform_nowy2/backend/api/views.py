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
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import timedelta
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Progress, User, Course, UserLearningTime

# Firebase imports
import firebase_admin
from firebase_admin import firestore

# Initialize Firebase if not already initialized
try:
    if not firebase_admin._apps:
        from learningplatform.firebase_config import verify_firebase_token
        print("Firebase already initialized")
    else:
        print("Firebase apps exist:", firebase_admin._apps)
except Exception as e:
    print(f"Firebase initialization error: {e}")

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

@api_view(['GET'])
def check_lessons(request):
    """Sprawdza czy są lekcje w systemie"""
    lessons = Lesson.objects.all()
    return Response({
        "lessons_count": lessons.count(),
        "first_lesson": {
            "id": lessons.first().id,
            "title": lessons.first().title
        } if lessons.exists() else None
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_endpoint(request):
    """Test endpoint do sprawdzenia czy Django działa"""
    return Response({"message": "Django działa!", "timestamp": timezone.now().isoformat()})

class TestEndpoint(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    
    def get(self, request):
        return Response({"message": "Django działa!", "timestamp": timezone.now().isoformat()})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def import_courses_from_firebase(request):
    """Importuje kursy z Firebase Firestore do Django"""
    try:
        import firebase_admin
        from firebase_admin import firestore
        
        # Inicjalizacja Firestore
        db = firestore.client()
        
        # Pobierz wszystkie kursy z Firebase
        courses_ref = db.collection('courses')
        firebase_courses = courses_ref.get()
        
        imported_count = 0
        updated_count = 0
        
        for doc in firebase_courses:
            course_data = doc.to_dict()
            doc_id = doc.id
            
            # Sprawdź czy kurs już istnieje w Django
            try:
                existing_course = Course.objects.get(firebase_id=doc_id)
                # Aktualizuj istniejący kurs
                existing_course.title = course_data.get('title', f'Kurs {doc_id}')
                existing_course.description = course_data.get('description', '')
                existing_course.save()
                updated_count += 1
                print(f"Updated course: {existing_course.title}")
            except Course.DoesNotExist:
                # Stwórz nowy kurs
                new_course = Course.objects.create(
                    firebase_id=doc_id,
                    title=course_data.get('title', f'Kurs {doc_id}'),
                    description=course_data.get('description', ''),
                    category_id=1  # Domyślna kategoria
                )
                imported_count += 1
                print(f"Imported course: {new_course.title}")
        
        return Response({
            "message": f"Import completed! Imported: {imported_count}, Updated: {updated_count}",
            "imported": imported_count,
            "updated": updated_count,
            "total_firebase_courses": len(firebase_courses)
        })
        
    except Exception as e:
        print(f"Error importing courses: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_learning_time(request):
    """Aktualizuje rzeczywisty czas spędzony na nauce"""
    try:
        lesson_id = request.data.get('lesson_id')
        time_spent_minutes = request.data.get('time_spent_minutes', 0)
        
        if not lesson_id:
            return Response({"error": "lesson_id is required"}, status=400)
        
        # Jeśli to ogólne śledzenie czasu (bez konkretnej lekcji)
        if lesson_id == 'general_learning':
            from datetime import date
            today = date.today()
            
            # Stwórz lub zaktualizuj ogólny czas nauki użytkownika
            learning_time, created = UserLearningTime.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={
                    'time_spent_minutes': time_spent_minutes
                }
            )
            
            if not created:
                # Dodaj czas do istniejącego wpisu
                learning_time.time_spent_minutes += time_spent_minutes
                learning_time.save()
            
            print(f"Updated general learning time for user {request.user.id}: +{time_spent_minutes} minutes, total: {learning_time.time_spent_minutes}")
            
            return Response({
                "message": "General learning time updated",
                "total_time_spent": learning_time.time_spent_minutes
            })
        
        # Dla konkretnych lekcji (jeśli kiedykolwiek będą używane)
        try:
            lesson = get_object_or_404(Lesson, id=lesson_id)
            progress, created = Progress.objects.get_or_create(
                user=request.user,
                lesson=lesson,
                defaults={
                    'completed': False,
                    'time_spent_minutes': time_spent_minutes
                }
            )
            
            if not created:
                # Dodaj czas do istniejącego postępu
                progress.time_spent_minutes = (progress.time_spent_minutes or 0) + time_spent_minutes
                progress.last_viewed = timezone.now()
                progress.save()
            
            return Response({
                "message": "Learning time updated",
                "total_time_spent": progress.time_spent_minutes
            })
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)
        
    except Exception as e:
        print(f"Error in update_learning_time: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_course(request):
    """Zapisuje użytkownika na kurs"""
    try:
        course_id = request.data.get('course_id')
        
        if not course_id:
            return Response({"error": "course_id is required"}, status=400)
        
        course = get_object_or_404(Course, id=course_id)
        
        # Dodaj użytkownika do kursu
        course.students.add(request.user)
        
        return Response({
            "message": f"Zostałeś zapisany na kurs: {course.title}",
            "course_id": course_id
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_courses(request):
    """Pobiera kursy użytkownika"""
    try:
        # Pobierz kursy, na które użytkownik jest zapisany
        enrolled_courses = Course.objects.filter(students=request.user)
        
        # Pobierz wszystkie dostępne kursy
        all_courses = Course.objects.all()
        
        courses_data = []
        for course in all_courses:
            is_enrolled = course in enrolled_courses
            
            # Pobierz postęp dla tego kursu
            try:
                progress_records = Progress.objects.filter(
                    user=request.user,
                    lesson__module__course=course
                )
                
                total_lessons = sum(module.lessons.count() for module in course.modules.all())
                completed_lessons = progress_records.filter(completed=True).count()
                progress_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
                
                last_access = progress_records.order_by('-last_viewed').first()
                
            except Exception:
                progress_percentage = 0
                last_access = None
            
            courses_data.append({
                'id': str(course.id),
                'title': course.title,
                'description': course.description,
                'thumbnail': course.thumbnail or '',
                'level': course.level,
                'is_enrolled': is_enrolled,
                'progress': round(progress_percentage, 1),
                'lastAccessed': last_access.last_viewed.isoformat() if last_access else None,
                'total_lessons': total_lessons if 'total_lessons' in locals() else 0,
                'completed_lessons': completed_lessons if 'completed_lessons' in locals() else 0
            })
        
        return Response({
            'enrolled_courses': [c for c in courses_data if c['is_enrolled']],
            'available_courses': [c for c in courses_data if not c['is_enrolled']],
            'all_courses': courses_data
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_stats(request, user_id):
    try:
        print(f"=== GET USER STATS ===")
        print(f"Request user: {request.user}")
        print(f"Request user firebase_uid: {request.user.firebase_uid}")
        print(f"Requested stats for user_id: {user_id}")

        # Sprawdź, czy użytkownik ma dostęp do tych statystyk
        if request.user.firebase_uid != user_id and not request.user.is_staff:
            return Response(
                {'error': 'Nie masz uprawnień do przeglądania tych statystyk'},
                status=403
            )

        # Pobierz użytkownika Django po firebase_uid
        try:
            target_user = User.objects.get(firebase_uid=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Nie znaleziono użytkownika'},
                status=404
            )

        time_range = request.GET.get('time_range', 'week')
        
        # Pobierz zakres dat na podstawie wybranego przedziału
        now = timezone.now()
        
        # Pobierz postępy użytkownika używając obiektu użytkownika
        progress_records = Progress.objects.filter(
            user=target_user,
            last_viewed__gte=now - timedelta(days=365)  # Ostatni rok
        ).select_related('lesson')
        
        if time_range == 'day':
            # Generuj serię godzinową 00-23 w oparciu o Firestore learningTime.byHour
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            time_spent_data = []
            by_hour_map = {}
            try:
                # Czytamy agregat z Firestore (tworzony przez frontend co minutę)
                import firebase_admin
                from firebase_admin import firestore as fb_fs
                fs_client = fb_fs.client()
                date_key = now.strftime('%Y-%m-%d')
                doc_id = f"{target_user.firebase_uid}_{date_key}"
                doc_ref = fs_client.collection('learningTime').document(doc_id)
                snap = doc_ref.get()
                if snap.exists:
                    data = snap.to_dict() or {}
                    by_hour_map = {str(k): int(v) for k, v in (data.get('byHour') or {}).items()}
            except Exception as e:
                # W razie problemów z FS, spadamy do 0 i nie przerywamy
                print(f"Warning: Firestore hourly read failed: {e}")

            # Fallback: jeśli nie mamy danych godzinowych z Firestore, użyj dziennej sumy z DB
            fallback_daily_minutes = 0
            if not by_hour_map:
                try:
                    from django.db.models import Sum as DjangoSum
                    fallback_daily_minutes = (
                        UserLearningTime.objects.filter(
                            user=target_user,
                            date=now.date()
                        ).aggregate(total_minutes=DjangoSum('time_spent_minutes'))['total_minutes'] or 0
                    )
                except Exception as e:
                    print(f"Warning: DB daily minutes fallback failed: {e}")

            for hour in range(24):
                hour_date = start_date.replace(hour=hour)
                fs_minutes = int(by_hour_map.get(str(hour), 0)) if by_hour_map else 0

                # Dodatkowo dolicz czas z Progress (jeśli ktoś ma pomiary per lekcja)
                progress_minutes = progress_records.filter(
                    last_viewed__date=hour_date.date(),
                    last_viewed__hour=hour
                ).aggregate(total_minutes=Sum('time_spent_minutes'))['total_minutes'] or 0

                # Jeśli brak danych z FS, włóż całą dzienną sumę do bieżącej godziny (przynajmniej coś widać)
                if not by_hour_map and fallback_daily_minutes > 0:
                    fs_minutes = fallback_daily_minutes if hour == now.hour else 0

                time_spent_data.append({
                    'date': hour_date.isoformat(),
                    'minutes': fs_minutes + progress_minutes
                })
        else:
            # Dla innych zakresów używamy dni
            if time_range == 'week':
                start_date = now - timedelta(days=7)
            elif time_range == 'month':
                start_date = now - timedelta(days=30)
            elif time_range == 'year':
                start_date = now - timedelta(days=365)
            else:  # 'all'
                start_date = now - timedelta(days=365*2)  # Ostatnie 2 lata

            # Agreguj rzeczywisty czas spędzony na nauce
            time_spent_data = []
            current_date = start_date
            while current_date <= now:
                # Użyj nowego modelu UserLearningTime dla ogólnego czasu nauki
                daily_minutes = UserLearningTime.objects.filter(
                    user=target_user,
                    date=current_date.date()
                ).aggregate(
                    total_minutes=Sum('time_spent_minutes')
                )['total_minutes'] or 0
                
                # Dodaj też czas z Progress (dla konkretnych lekcji, jeśli będą)
                progress_minutes = progress_records.filter(
                    last_viewed__date=current_date.date()
                ).aggregate(
                    total_minutes=Sum('time_spent_minutes')
                )['total_minutes'] or 0
                
                total_daily_minutes = daily_minutes + progress_minutes
                
                time_spent_data.append({
                    'date': current_date.isoformat(),
                    'minutes': total_daily_minutes
                })
                current_date += timedelta(days=1)

        print(f"Time spent data: {time_spent_data}")
        print(f"Total progress records: {progress_records.count()}")
        print(f"Progress records with time_spent_minutes > 0: {progress_records.filter(time_spent_minutes__gt=0).count()}")
        
        # Oblicz totalTimeSpent
        total_time_spent = sum(entry['minutes'] for entry in time_spent_data)
        print(f"Calculated totalTimeSpent: {total_time_spent}")
        print(f"Time spent data entries: {len(time_spent_data)}")
        for entry in time_spent_data:
            print(f"  {entry['date']}: {entry['minutes']} minutes")

        # Pobierz aktywne kursy używając obiektu użytkownika
        # Używamy relacji students zamiast progress, bo użytkownik może być zapisany na kurs bez postępu
        active_courses = Course.objects.filter(
            students=target_user
        ).distinct()

        # Zawsze sprawdź i wyczyść kursy z Firebase
        try:
            print(f"Checking and cleaning courses for user {target_user.username}...")
            import firebase_admin
            from firebase_admin import firestore
            
            # Inicjalizacja Firestore
            db = firestore.client()
            
            # Upewnij się, że istnieje domyślna kategoria
            default_category, created = Category.objects.get_or_create(
                id=1,
                defaults={
                    'name': 'Ogólne',
                    'description': 'Kursy ogólne',
                    'order': 1
                }
            )
            
            # Upewnij się, że istnieje domyślny instruktor
            default_instructor, created = User.objects.get_or_create(
                id=1,
                defaults={
                    'username': 'admin',
                    'email': 'admin@example.com',
                    'is_staff': True,
                    'is_superuser': True
                }
            )
            
            # Pobierz wszystkie kursy z Firebase
            courses_ref = db.collection('courses')
            firebase_courses = courses_ref.get()
            
            imported_count = 0
            for doc in firebase_courses:
                course_data = doc.to_dict()
                doc_id = doc.id
                
                # Sprawdź czy kurs już istnieje w Django
                try:
                    existing_course = Course.objects.get(firebase_id=doc_id)
                except Course.DoesNotExist:
                    # Stwórz nowy kurs
                    new_course = Course.objects.create(
                        firebase_id=doc_id,
                        title=course_data.get('title', f'Kurs {doc_id}'),
                        description=course_data.get('description', ''),
                        slug=f'course-{doc_id}',
                        category=default_category,
                        instructor=default_instructor
                    )
                    imported_count += 1
                    print(f"Imported course: {new_course.title}")
            
            print(f"Imported {imported_count} courses from Firebase")
            
            # Sprawdź czy użytkownik ma przypisane kursy w Firebase
            # Pobierz kursy z Firebase i sprawdź pole assignedUsers
            courses_ref = db.collection('courses')
            firebase_courses = courses_ref.get()
            
            # Lista kursów które użytkownik powinien mieć
            should_have_courses = []
            
            print(f"Checking Firebase courses for user {target_user.username} (UID: {target_user.firebase_uid})")
            print(f"Checking {len(firebase_courses)} courses for assignedUsers field")
            
            for doc in firebase_courses:
                course_data = doc.to_dict()
                doc_id = doc.id
                assigned_users = course_data.get('assignedUsers', [])
                
                # Sprawdź czy użytkownik jest w assignedUsers
                if target_user.firebase_uid in assigned_users or target_user.email in assigned_users:
                    should_have_courses.append(doc_id)
                    print(f"User assigned to course: {doc_id} (title: {course_data.get('title', 'Unknown')})")
                    try:
                        course = Course.objects.get(firebase_id=doc_id)
                        course.students.add(target_user)
                        print(f"Enrolled user {target_user.username} in course {course.title}")
                    except Course.DoesNotExist:
                        print(f"Course {doc_id} not found in Django")
            
            print(f"User should have {len(should_have_courses)} courses: {should_have_courses}")
            
            # Usuń kursy których użytkownik nie powinien mieć
            current_courses = Course.objects.filter(students=target_user)
            print(f"User currently has {current_courses.count()} courses in Django")
            
            # Jeśli użytkownik nie ma kursów w Firebase, zachowaj obecne kursy
            if len(should_have_courses) == 0:
                print(f"User has no courses in Firebase, keeping all current courses")
                # Nie usuwaj żadnych kursów - zachowaj obecne
            else:
                # Usuń tylko kursy których nie ma w Firebase
                for course in current_courses:
                    print(f"Checking course: {course.title} (Firebase ID: {course.firebase_id})")
                    if course.firebase_id not in should_have_courses:
                        course.students.remove(target_user)
                        print(f"REMOVED user {target_user.username} from course {course.title} (not in Firebase)")
                    else:
                        print(f"KEEPING user {target_user.username} in course {course.title} (in Firebase)")
            
            # Pobierz ponownie aktywne kursy
            active_courses = Course.objects.filter(
                students=target_user
            ).distinct()
            
            print(f"Final active courses count: {active_courses.count()}")
            
        except Exception as e:
            print(f"Error importing courses from Firebase: {str(e)}")
            # Kontynuuj bez kursów

        # Oblicz postęp dla każdego kursu
        course_progress = []
        for course in active_courses:
            try:
                total_lessons = sum(module.lessons.count() for module in course.modules.all())
                completed_lessons = progress_records.filter(
                    lesson__module__course=course,
                    completed=True
                ).count()
                
                progress_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
                last_access = progress_records.filter(
                    lesson__module__course=course
                ).order_by('-last_viewed').first()
                
                course_progress.append({
                    'id': str(course.id),
                    'title': course.title,
                    'thumbnail': course.thumbnail or '',
                    'lastAccessed': last_access.last_viewed.isoformat() if last_access else None,
                    'progress': round(progress_percentage, 1)
                })
            except Exception as e:
                print(f"Error processing course {course.id}: {str(e)}")
                continue

        course_progress.sort(key=lambda x: x['lastAccessed'] or '', reverse=True)

        # Przygotuj dane do odpowiedzi
        response_data = {
            'level': 1,  # Placeholder
            'experience': 0,  # Placeholder
            'experienceToNextLevel': 1000,  # Placeholder
            'points': 0,  # Placeholder
            'totalTimeSpent': total_time_spent,
            'loginStreak': 0,  # Placeholder
            'completedCourses': len([c for c in course_progress if c['progress'] == 100]),
            'timeSpentData': time_spent_data,
            'activeCourses': [c for c in course_progress if c['progress'] < 100],
            'completedCoursesList': [
                {
                    'courseId': c['id'],
                    'title': c['title'],
                    'progress': c['progress'],
                    'completedAt': c['lastAccessed']
                }
                for c in course_progress if c['progress'] == 100
            ],
            'badges': []  # Placeholder
        }

        print(f"Debug - Active courses found: {len(response_data['activeCourses'])}")
        print(f"Debug - Course progress data: {course_progress}")
        print(f"Debug - User enrolled courses: {list(active_courses.values_list('title', flat=True))}")

        return Response(response_data)

    except Exception as e:
        print(f"Error processing stats: {str(e)}")
        return Response(
            {'error': f'Wystąpił błąd podczas przetwarzania statystyk: {str(e)}'},
            status=500
        )

    except Exception as e:
        print(f"Error in get_user_stats: {str(e)}")
        return Response(
            {'error': str(e)},
            status=500
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_courses(request):
    """Debug endpoint do sprawdzenia przypisań kursów użytkownika"""
    try:
        user = request.user
        print(f"Debug - User: {user.username} (ID: {user.id})")
        
        # Sprawdź wszystkie kursy
        all_courses = Course.objects.all()
        print(f"Debug - All courses: {list(all_courses.values_list('title', flat=True))}")
        
        # Sprawdź kursy, na które użytkownik jest zapisany
        enrolled_courses = Course.objects.filter(students=user)
        print(f"Debug - Enrolled courses: {list(enrolled_courses.values_list('title', flat=True))}")
        
        # Sprawdź kursy przez relację wsteczną
        user_courses = user.courses_enrolled.all()
        print(f"Debug - User courses (reverse): {list(user_courses.values_list('title', flat=True))}")
        
        # Sprawdź postęp użytkownika
        progress_records = Progress.objects.filter(user=user)
        print(f"Debug - Progress records count: {progress_records.count()}")
        
        return Response({
            'user_id': user.id,
            'username': user.username,
            'all_courses': list(all_courses.values('id', 'title')),
            'enrolled_courses': list(enrolled_courses.values('id', 'title')),
            'user_courses_reverse': list(user_courses.values('id', 'title')),
            'progress_count': progress_records.count()
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)
