from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Set a user as a teacher'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to set as teacher')

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = User.objects.get(email=email)
            user.is_teacher = True
            user.is_student = False
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully set {email} as teacher')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email {email} does not exist')
            ) 