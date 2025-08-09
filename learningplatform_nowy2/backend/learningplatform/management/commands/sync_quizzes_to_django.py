from django.core.management.base import BaseCommand
from django.db import transaction
from firebase_admin import firestore
from api.models import User
from learningplatform.models import Quiz, Course, Question, Answer

class Command(BaseCommand):
    help = 'Synchronizes quizzes from Firestore to Django database'

    def get_or_create_user(self, email):
        """Znajdź lub utwórz użytkownika na podstawie emaila."""
        if not email:
            # Jeśli nie ma emaila, użyj domyślnego użytkownika admina
            return User.objects.filter(is_superuser=True).first()

        try:
            user = User.objects.get(email=email)
            self.stdout.write(f'Found existing user: {email}')
            return user
        except User.DoesNotExist:
            # Utwórz nowego użytkownika
            username = email.split('@')[0]
            user = User.objects.create_user(
                username=username,
                email=email,
                password='temporary123',  # Tymczasowe hasło
                is_teacher=True  # Zakładamy, że twórcy quizów to nauczyciele
            )
            self.stdout.write(f'Created new user: {email}')
            return user

    def handle(self, *args, **options):
        db = firestore.client()
        self.stdout.write('Fetching quizzes from Firestore...')

        # Pobierz wszystkie quizy z Firestore
        quizzes_ref = db.collection('quizzes')
        quizzes = quizzes_ref.stream()

        for quiz_doc in quizzes:
            quiz_data = quiz_doc.to_dict()
            self.stdout.write(f"Processing quiz {quiz_doc.id}: {quiz_data.get('title', 'No title')}")

            try:
                with transaction.atomic():
                    # Znajdź lub utwórz twórcę quizu
                    creator_email = quiz_data.get('created_by')
                    creator = self.get_or_create_user(creator_email)

                    # Znajdź lub utwórz quiz w Django
                    quiz, created = Quiz.objects.get_or_create(
                        firebase_id=quiz_doc.id,
                        defaults={
                            'title': quiz_data.get('title', ''),
                            'description': quiz_data.get('description', ''),
                            'subject': quiz_data.get('subject', ''),
                            'created_by': creator
                        }
                    )

                    # Aktualizuj istniejący quiz jeśli potrzeba
                    if not created:
                        quiz.title = quiz_data.get('title', quiz.title)
                        quiz.description = quiz_data.get('description', quiz.description)
                        quiz.subject = quiz_data.get('subject', quiz.subject)
                        quiz.created_by = creator

                    # Przypisz kurs jeśli istnieje
                    course_id = quiz_data.get('course_id')
                    if course_id:
                        try:
                            course = Course.objects.get(firebase_id=course_id)
                            quiz.course = course
                        except Course.DoesNotExist:
                            self.stdout.write(self.style.WARNING(f'Course {course_id} not found'))

                    quiz.save()

                    # Synchronizuj pytania
                    questions = quiz_data.get('questions', [])
                    existing_questions = set(quiz.questions.values_list('order', flat=True))
                    
                    for q_idx, question_data in enumerate(questions):
                        question, _ = Question.objects.update_or_create(
                            quiz=quiz,
                            order=q_idx,
                            defaults={
                                'content': question_data.get('content', ''),
                                'type': question_data.get('type', 'text'),
                                'explanation': question_data.get('explanation', '')
                            }
                        )

                        # Usuń stare odpowiedzi i dodaj nowe
                        question.answers.all().delete()
                        answers = question_data.get('answers', [])
                        for answer_data in answers:
                            Answer.objects.create(
                                question=question,
                                content=answer_data.get('content', ''),
                                is_correct=answer_data.get('isCorrect', False),
                                type=answer_data.get('type', 'text')
                            )

                        if q_idx in existing_questions:
                            existing_questions.remove(q_idx)

                    # Usuń pytania, których nie ma już w Firestore
                    if existing_questions:
                        Question.objects.filter(quiz=quiz, order__in=existing_questions).delete()

                    status = 'Created' if created else 'Updated'
                    self.stdout.write(self.style.SUCCESS(f'{status} quiz: {quiz.title}'))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing quiz {quiz_doc.id}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS('Quiz synchronization completed')) 