from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import User
from learningplatform.models import Quiz

class Command(BaseCommand):
    help = 'Creates a test quiz with firebase_id'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Znajdź lub utwórz użytkownika
                user = User.objects.filter(is_superuser=True).first()
                if not user:
                    user = User.objects.create_superuser(
                        username='admin',
                        email='admin@example.com',
                        password='admin123'
                    )
                    self.stdout.write(self.style.SUCCESS(f'Created admin user: {user.email}'))

                # Utwórz quiz
                quiz = Quiz.objects.create(
                    title='www',
                    subject='Język niemiecki',
                    created_by=user,
                    firebase_id='6npGeBAPPbZRlDPJPACB'
                )
                self.stdout.write(self.style.SUCCESS(f'Created quiz: {quiz.id} with firebase_id: {quiz.firebase_id}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating quiz: {str(e)}')) 