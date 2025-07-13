from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Updates user role (teacher/student)'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username of the user to update')
        parser.add_argument('--teacher', action='store_true', help='Set user as teacher')
        parser.add_argument('--student', action='store_true', help='Set user as student')

    def handle(self, *args, **options):
        username = options['username']
        try:
            user = User.objects.get(username=username)
            
            if options['teacher']:
                user.is_teacher = True
                user.is_student = False
                self.stdout.write(self.style.SUCCESS(f'Successfully set {username} as teacher'))
            elif options['student']:
                user.is_teacher = False
                user.is_student = True
                self.stdout.write(self.style.SUCCESS(f'Successfully set {username} as student'))
            else:
                self.stdout.write(self.style.ERROR('Please specify either --teacher or --student'))
                return
                
            user.save()
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User {username} does not exist')) 