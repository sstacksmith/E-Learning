from django.core.management.base import BaseCommand
from django.db import transaction
import firebase_admin
from firebase_admin import firestore


class Command(BaseCommand):
    help = "Usuwa WSZYSTKIE statystyki uczniów - czas nauki, sesje, próby quizów"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Potwierdź usunięcie wszystkich statystyk",
        )

    def handle(self, *args, **options):
        if not options.get("confirm"):
            self.stderr.write(
                self.style.ERROR(
                    "⚠️  Ta komenda usunie WSZYSTKIE statystyki uczniów!\n"
                    "   - userSessions (Firestore)\n"
                    "   - learningTime (Firestore)\n"
                    "   - user_learning_time (Firestore)\n"
                    "   - QuizAttempt (Django)\n\n"
                    "Uruchom ponownie z flagą --confirm aby potwierdzić."
                )
            )
            return

        self.stdout.write(self.style.WARNING("🧹 Rozpoczynam czyszczenie statystyk uczniów..."))

        # 1. Usuń QuizAttempt z Django
        attempts_count = 0
        try:
            from learningplatform.models import QuizAttempt
            
            with transaction.atomic():
                attempts_count = QuizAttempt.objects.count()
                QuizAttempt.objects.all().delete()
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Usunięto {attempts_count} prób quizów z Django")
                )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️  QuizAttempt not available (Django DB not configured): {e}"))

        # 2. Usuń kolekcje z Firestore
        try:
            # Inicjalizuj Firestore
            try:
                from learningplatform import firebase_config  # noqa: F401
            except:
                pass
            
            db = firestore.client()

            def delete_collection(coll_name: str) -> int:
                """Usuwa całą kolekcję z Firestore"""
                count = 0
                coll_ref = db.collection(coll_name)
                docs = coll_ref.stream()
                batch = db.batch()
                
                for i, doc in enumerate(docs, start=1):
                    batch.delete(doc.reference)
                    count += 1
                    # Commit co 400 operacji (limit batcha to 500)
                    if i % 400 == 0:
                        batch.commit()
                        batch = db.batch()
                        self.stdout.write(f"  📦 Usunięto {count} dokumentów z {coll_name}...")
                
                # Commit pozostałych operacji
                if count % 400 != 0:
                    batch.commit()
                
                return count

            # Usuń userSessions
            self.stdout.write("🔄 Usuwam userSessions...")
            sessions_deleted = delete_collection('userSessions')
            self.stdout.write(
                self.style.SUCCESS(f"✅ Usunięto {sessions_deleted} dokumentów z userSessions")
            )

            # Usuń learningTime
            self.stdout.write("🔄 Usuwam learningTime...")
            learning_time_deleted = delete_collection('learningTime')
            self.stdout.write(
                self.style.SUCCESS(f"✅ Usunięto {learning_time_deleted} dokumentów z learningTime")
            )

            # Usuń user_learning_time
            self.stdout.write("🔄 Usuwam user_learning_time...")
            user_learning_time_deleted = delete_collection('user_learning_time')
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Usunięto {user_learning_time_deleted} dokumentów z user_learning_time"
                )
            )

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Błąd przy czyszczeniu Firestore: {e}"))
            import traceback
            self.stderr.write(traceback.format_exc())
            # Set defaults in case of error
            sessions_deleted = 0
            learning_time_deleted = 0
            user_learning_time_deleted = 0

        # Final summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 Zakończono czyszczenie! Usunięto łącznie:\n"
                f"   - {sessions_deleted} sesji użytkowników\n"
                f"   - {learning_time_deleted} rekordów czasu nauki (agregaty)\n"
                f"   - {user_learning_time_deleted} szczegółowych rekordów czasu\n"
                f"   - {attempts_count} prób quizów"
            )
        )
        self.stdout.write(self.style.SUCCESS("\n✨ Statystyki uczniów zostały wyczyszczone!"))

