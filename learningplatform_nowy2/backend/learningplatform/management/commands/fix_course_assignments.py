from django.core.management.base import BaseCommand
from learningplatform.models import Course, CourseAssignment
from api.models import User
from learningplatform.views import sync_course_to_firestore
import firebase_admin
from firebase_admin import firestore
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Naprawia przypisania kursów i synchronizuje je z Firestore'

    def add_arguments(self, parser):
        parser.add_argument(
            '--course-id',
            type=int,
            help='ID konkretnego kursu do naprawy (opcjonalne)',
        )
        parser.add_argument(
            '--fix-firestore',
            action='store_true',
            help='Napraw dane w Firestore',
        )

    def handle(self, *args, **options):
        course_id = options.get('course_id')
        fix_firestore = options.get('fix_firestore')
        
        # Inicjalizuj Firebase jeśli nie jest zainicjalizowany
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        
        db = firestore.client()
        
        if course_id:
            # Napraw konkretny kurs
            try:
                course = Course.objects.get(id=course_id)
                self.fix_course_assignments(course, db, fix_firestore)
            except Course.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Kurs o ID {course_id} nie istnieje')
                )
        else:
            # Napraw wszystkie kursy
            courses = Course.objects.all()
            self.stdout.write(f'Rozpoczynam naprawę {courses.count()} kursów...')
            
            for course in courses:
                self.fix_course_assignments(course, db, fix_firestore)
            
            self.stdout.write(
                self.style.SUCCESS('Naprawa przypisań kursów zakończona!')
            )

    def fix_course_assignments(self, course, db, fix_firestore):
        """Naprawia przypisania dla konkretnego kursu"""
        self.stdout.write(f'\nNaprawiam kurs: {course.title} (ID: {course.id})')
        
        # Pobierz aktywne przypisania z Django
        assignments = CourseAssignment.objects.filter(course=course, is_active=True)
        assigned_users = []
        
        for assignment in assignments:
            student = assignment.student
            user_info = {
                'id': student.id,
                'email': student.email,
                'username': student.username,
                'first_name': student.first_name or '',
                'last_name': student.last_name or '',
                'assigned_date': assignment.assigned_date.isoformat(),
                'assigned_by': assignment.assigned_by.email if assignment.assigned_by else ''
            }
            assigned_users.append(user_info)
        
        self.stdout.write(f'  - Znaleziono {len(assigned_users)} aktywnych przypisań w Django')
        
        if fix_firestore:
            # Napraw dane w Firestore
            try:
                course_ref = db.collection('courses').document(str(course.id))
                course_doc = course_ref.get()
                
                if course_doc.exists:
                    # Aktualizuj istniejący dokument
                    current_data = course_doc.to_dict()
                    
                    # Przygotuj listę identyfikatorów użytkowników dla Firestore
                    firestore_user_ids = []
                    for user in assigned_users:
                        # Dodaj email jako identyfikator (Firebase UID może nie być dostępny)
                        firestore_user_ids.append(user['email'])
                    
                    # Aktualizuj dane kursu
                    updated_data = {
                        'assignedUsers': firestore_user_ids,
                        'total_students': len(assigned_users),
                        'last_updated': firebase_admin.firestore.SERVER_TIMESTAMP
                    }
                    
                    course_ref.update(updated_data)
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Zaktualizowano Firestore - {len(firestore_user_ids)} użytkowników')
                    )
                else:
                    # Utwórz nowy dokument w Firestore
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
                        'assignedUsers': [user['email'] for user in assigned_users],
                        'sections': [],
                        'total_students': len(assigned_users)
                    }
                    
                    # Usuń None wartości
                    course_data = {k: v for k, v in course_data.items() if v is not None}
                    
                    course_ref.set(course_data)
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Utworzono dokument w Firestore - {len(assigned_users)} użytkowników')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Błąd podczas naprawy Firestore: {e}')
                )
        
        # Wyświetl szczegóły przypisań
        if assigned_users:
            self.stdout.write('  Przypisani użytkownicy:')
            for user in assigned_users:
                display_name = f"{user['first_name']} {user['last_name']}".strip() or user['username']
                self.stdout.write(f'    - {display_name} ({user["email"]})')
        else:
            self.stdout.write('  Brak przypisanych użytkowników') 