from django.core.management.base import BaseCommand
from learningplatform.models import Course
import firebase_admin
from firebase_admin import firestore

class Command(BaseCommand):
    help = 'Synchronize all courses from Django to Firestore'

    def handle(self, *args, **options):
        # Initialize Firestore if not already initialized
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        
        db = firestore.client()
        
        # Get all courses from Django
        courses = Course.objects.all()
        
        self.stdout.write(f"Found {courses.count()} courses to synchronize...")
        
        for course in courses:
            try:
                # Create or update course in Firestore
                course_ref = db.collection('courses').document(str(course.id))
                course_ref.set({
                    'id': course.id,
                    'title': course.title,
                    'description': course.description,
                    'year_of_study': course.year_of_study,
                    'subject': course.subject,
                    'is_active': course.is_active,
                    'created_by': course.created_by.id,
                    'created_at': course.created_at.isoformat(),
                    'updated_at': course.updated_at.isoformat(),
                    'pdfUrls': course.pdfUrls,
                    'links': course.links,
                    'slug': course.slug,
                    'assignedUsers': []
                }, merge=True)
                
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully synchronized course "{course.title}" (ID: {course.id})')
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to synchronize course "{course.title}" (ID: {course.id}): {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('Course synchronization completed!')
        ) 