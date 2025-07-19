from django.core.management.base import BaseCommand
from learningplatform.models import Course
from learningplatform.views import sync_course_to_firestore
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronizuje wszystkie kursy z Django do Firestore'

    def add_arguments(self, parser):
        parser.add_argument(
            '--course-id',
            type=int,
            help='ID konkretnego kursu do synchronizacji (opcjonalne)',
        )

    def handle(self, *args, **options):
        course_id = options.get('course_id')
        
        if course_id:
            # Synchronizuj konkretny kurs
            try:
                course = Course.objects.get(id=course_id)
                success = sync_course_to_firestore(course, 'create')
                if success:
                    self.stdout.write(
                        self.style.SUCCESS(f'Kurs {course.title} (ID: {course.id}) został zsynchronizowany z Firestore')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'Błąd synchronizacji kursu {course.title} (ID: {course.id})')
                    )
            except Course.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Kurs o ID {course_id} nie istnieje')
                )
        else:
            # Synchronizuj wszystkie kursy
            courses = Course.objects.all()
            self.stdout.write(f'Rozpoczynam synchronizację {courses.count()} kursów...')
            
            success_count = 0
            error_count = 0
            
            for course in courses:
                try:
                    success = sync_course_to_firestore(course, 'create')
                    if success:
                        self.stdout.write(
                            self.style.SUCCESS(f'✓ Kurs {course.title} (ID: {course.id}) zsynchronizowany')
                        )
                        success_count += 1
                    else:
                        self.stdout.write(
                            self.style.ERROR(f'✗ Błąd synchronizacji kursu {course.title} (ID: {course.id})')
                        )
                        error_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'✗ Wyjątek podczas synchronizacji kursu {course.title} (ID: {course.id}): {e}')
                    )
                    error_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSynchronizacja zakończona. Sukces: {success_count}, Błędy: {error_count}'
                )
            ) 