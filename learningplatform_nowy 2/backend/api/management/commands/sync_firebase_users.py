from django.core.management.base import BaseCommand
from api.models import User
from firebase_admin import auth

class Command(BaseCommand):
    help = 'Synchronizuj użytkowników z Firebase do Django'

    def handle(self, *args, **options):
        count = 0
        for user_record in auth.list_users().iterate_all():
            email = user_record.email
            if not email:
                continue
            username = email.split('@')[0]
            custom_claims = user_record.custom_claims or {}
            role = custom_claims.get('role', 'student')
            is_teacher = role == 'teacher'
            is_superuser = role == 'admin'
            is_student = not is_teacher and not is_superuser

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'is_teacher': is_teacher,
                    'is_student': is_student,
                    'is_superuser': is_superuser,
                    'password': None,
                }
            )
            if not created:
                # Aktualizuj role jeśli się zmieniły
                user.is_teacher = is_teacher
                user.is_student = is_student
                user.is_superuser = is_superuser
                user.save()
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Zsynchronizowano {count} użytkowników z Firebase!')) 