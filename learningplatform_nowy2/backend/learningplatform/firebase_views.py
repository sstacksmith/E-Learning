"""
Firebase-only views that don't require Django models
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

class UpdateLearningTimeView(APIView):
    """
    View do aktualizacji czasu nauki użytkownika
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        print(f"=== UPDATE LEARNING TIME REQUEST ===")
        print(f"User: {request.user.email if request.user.is_authenticated else 'Not authenticated'}")
        print(f"User ID: {request.user.id if request.user.is_authenticated else 'N/A'}")
        print(f"User is_teacher: {request.user.is_teacher if request.user.is_authenticated else 'N/A'}")
        print(f"User is_student: {request.user.is_student if request.user.is_authenticated else 'N/A'}")
        print(f"User is_superuser: {request.user.is_superuser if request.user.is_authenticated else 'N/A'}")
        print(f"User firebase_uid: {request.user.firebase_uid if request.user.is_authenticated else 'N/A'}")
        print(f"Request data: {request.data}")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request user type: {type(request.user)}")
        print(f"Request user class: {request.user.__class__}")
        
        # Sprawdź czy użytkownik jest uwierzytelniony
        if not request.user.is_authenticated:
            print("❌ User not authenticated!")
            return Response({'error': 'User not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Sprawdź czy użytkownik ma odpowiednie uprawnienia (student, teacher, admin)
        if not (request.user.is_student or request.user.is_teacher or request.user.is_superuser):
            print(f"❌ User {request.user.email} has no valid role! is_student: {request.user.is_student}, is_teacher: {request.user.is_teacher}, is_superuser: {request.user.is_superuser}")
            return Response({'error': 'User has no valid role for this operation'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            lesson_id = request.data.get('lesson_id', 'general_learning')
            time_spent_minutes = request.data.get('time_spent_minutes', 0)
            
            # Walidacja danych
            if not isinstance(time_spent_minutes, (int, float)) or time_spent_minutes <= 0:
                return Response({
                    'error': 'time_spent_minutes must be a positive number'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Tutaj możesz dodać logikę zapisywania do bazy danych
            # Na razie tylko logujemy i zwracamy sukces
            print(f"User {request.user.id} spent {time_spent_minutes} minutes on lesson {lesson_id}")
            
            # Opcjonalnie: zapisz do modelu LearningTime jeśli istnieje
            # lub użyj Firebase/innej bazy danych
            
            return Response({
                'success': True,
                'message': f'Successfully recorded {time_spent_minutes} minutes of learning time',
                'user_id': request.user.id,
                'lesson_id': lesson_id,
                'time_spent_minutes': time_spent_minutes
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error in UpdateLearningTimeView: {str(e)}")
            return Response({
                'error': f'Error updating learning time: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)









