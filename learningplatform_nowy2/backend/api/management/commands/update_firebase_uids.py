from django.core.management.base import BaseCommand
from api.models import User
from firebase_admin import auth

class Command(BaseCommand):
    help = 'Update Firebase UIDs for existing users'

    def handle(self, *args, **options):
        count = 0
        updated = 0
        
        for user_record in auth.list_users().iterate_all():
            email = user_record.email
            if not email:
                continue
                
            try:
                user = User.objects.get(email=email)
                if not user.firebase_uid:
                    user.firebase_uid = user_record.uid
                    user.save()
                    updated += 1
                    self.stdout.write(f'Updated Firebase UID for {email}: {user_record.uid}')
                count += 1
            except User.DoesNotExist:
                self.stdout.write(f'User with email {email} not found in Django database')
        
        self.stdout.write(self.style.SUCCESS(f'Processed {count} Firebase users, updated {updated} Django users')) 