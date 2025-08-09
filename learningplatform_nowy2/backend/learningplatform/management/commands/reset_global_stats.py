from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import UserLearningTime, Progress, User


class Command(BaseCommand):
    help = "Resetuje globalnie statystyki czasu/postapu wszystkich uc7nk7dw (UserLearningTime, Progress.time_spent_minutes). Usuwa dane w Firestore: userSessions, learningTime."

    def add_arguments(self, parser):
        parser.add_argument(
            "--i-understand",
            action="store_true",
            help="Wymagane potwierdzenie operacji destrukcyjnej",
        )

    def handle(self, *args, **options):
        if not options.get("i_understand"):
            self.stderr.write(
                self.style.ERROR(
                    "Ta komenda usunie/wyzeruje statystyki dla WSZYSTKICH uc7nk7dw. Uruchom ponownie z flag05 --i-understand."
                )
            )
            return

        # Reset w bazie Django
        with transaction.atomic():
            lt_deleted, _ = UserLearningTime.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Usuni19to wpis7w UserLearningTime: {lt_deleted}"))

            prog_updated = Progress.objects.all().update(time_spent_minutes=0, completed=False)
            self.stdout.write(self.style.WARNING(f"Zresetowano Progress (czas=0, completed=False): {prog_updated}"))

        # Reset w Firestore
        try:
            # Import inicjalizuje firebase_admin
            from learningplatform import firebase_config  # noqa: F401
            import firebase_admin
            from firebase_admin import firestore

            db = firestore.client()

            def delete_collection(coll_name: str) -> int:
                count = 0
                coll_ref = db.collection(coll_name)
                docs = coll_ref.stream()
                batch = db.batch()
                for i, doc in enumerate(docs, start=1):
                    batch.delete(doc.reference)
                    count += 1
                    # Commit co 400 operacji (limit batcha 500)
                    if i % 400 == 0:
                        batch.commit()
                        batch = db.batch()
                batch.commit()
                return count

            us_deleted = delete_collection('userSessions')
            lt_deleted_fs = delete_collection('learningTime')

            self.stdout.write(self.style.WARNING(f"Firestore: usuni19to userSessions: {us_deleted}, learningTime: {lt_deleted_fs}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"B9d czyszczenia Firestore: {e}"))

        self.stdout.write(self.style.SUCCESS("Globalny reset statystyk zako4czony."))


