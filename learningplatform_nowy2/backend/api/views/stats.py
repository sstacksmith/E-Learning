from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import timedelta
from django.db.models import Sum, Count
from ..models import User, Progress, Course

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_stats(request, user_id):
    time_range = request.GET.get('timeRange', 'week')
    
    # Pobierz zakres dat na podstawie wybranego przedziału
    now = timezone.now()
    if time_range == 'day':
        start_date = now - timedelta(days=1)
        date_format = '%H:%M'
    elif time_range == 'week':
        start_date = now - timedelta(days=7)
        date_format = '%Y-%m-%d'
    elif time_range == 'month':
        start_date = now - timedelta(days=30)
        date_format = '%Y-%m-%d'
    elif time_range == 'year':
        start_date = now - timedelta(days=365)
        date_format = '%Y-%m'
    else:  # 'all'
        start_date = now - timedelta(days=365*2)  # Ostatnie 2 lata
        date_format = '%Y-%m'

    # Pobierz postępy użytkownika
    progress_records = Progress.objects.filter(
        user_id=user_id,
        last_viewed__gte=start_date
    ).select_related('lesson')

    # Agreguj czas spędzony na nauce
    time_spent_data = []
    current_date = start_date
    while current_date <= now:
        daily_minutes = progress_records.filter(
            last_viewed__date=current_date.date()
        ).aggregate(
            total_minutes=Sum('lesson__duration_minutes')
        )['total_minutes'] or 0
        
        time_spent_data.append({
            'date': current_date.strftime(date_format),
            'minutes': daily_minutes
        })
        current_date += timedelta(days=1)

    # Pobierz aktywne kursy (te, w których użytkownik ma jakiś postęp)
    active_courses = Course.objects.filter(
        modules__lessons__progress__user_id=user_id
    ).distinct()

    # Oblicz postęp dla każdego kursu
    course_progress = []
    for course in active_courses:
        total_lessons = sum(module.lessons.count() for module in course.modules.all())
        completed_lessons = progress_records.filter(
            lesson__module__course=course,
            completed=True
        ).count()
        
        progress_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        course_progress.append({
            'id': course.id,
            'title': course.title,
            'thumbnail': course.thumbnail or '',
            'lastAccessed': progress_records.filter(
                lesson__module__course=course
            ).latest('last_viewed').last_viewed.isoformat() if progress_records.exists() else None,
            'progress': round(progress_percentage, 1)
        })

    # Sortuj kursy po ostatniej aktywności
    course_progress.sort(key=lambda x: x['lastAccessed'] or '', reverse=True)

    # Przygotuj dane do odpowiedzi
    response_data = {
        'level': 1,  # Placeholder - do implementacji systemu poziomów
        'experience': 0,  # Placeholder - do implementacji systemu XP
        'experienceToNextLevel': 1000,  # Placeholder
        'points': 0,  # Placeholder - do implementacji systemu punktów
        'totalTimeSpent': sum(entry['minutes'] for entry in time_spent_data),
        'loginStreak': 0,  # Placeholder - do implementacji systemu serii logowań
        'completedCourses': len([c for c in course_progress if c['progress'] == 100]),
        'timeSpentData': time_spent_data,
        'activeCourses': [c for c in course_progress if c['progress'] < 100],
        'completedCoursesList': [
            {
                'courseId': c['id'],
                'title': c['title'],
                'progress': c['progress'],
                'completedAt': c['lastAccessed']
            }
            for c in course_progress if c['progress'] == 100
        ],
        'badges': []  # Placeholder - do implementacji systemu odznak
    }

    return Response(response_data) 