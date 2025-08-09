import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from learningplatform.models import Quiz
from api.models import User
from django.db import transaction

def create_quiz():
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

            # Utwórz quiz
            quiz = Quiz.objects.create(
                title='www',
                subject='Język niemiecki',
                created_by=user,
                firebase_id='6npGeBAPPbZRlDPJPACB'
            )
            print(f'Created quiz: {quiz.id} with firebase_id: {quiz.firebase_id}')
    except Exception as e:
        print(f'Error creating quiz: {str(e)}')

if __name__ == '__main__':
    create_quiz() 