# Course Creation Fix for Teachers


!!!!!!!!!!!!!!!!!!
#NA TEN MOMENT NIE AKTUALNE!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!

## Problem
Teachers were unable to create courses because the authentication system wasn't properly syncing Firebase user roles with Django user permissions.

## Solution Implemented

### 1. Fixed Authentication Backend
- Created a new `FirebaseAuthentication` class in `backend/learning_platform/authentication.py`
- Updated Django settings to use Firebase authentication
- The backend now properly verifies Firebase tokens and syncs user roles

### 2. Fixed Frontend Token Handling
- Updated the teacher courses page to use the correct Firebase token
- Changed from `localStorage.getItem('token')` to `localStorage.getItem('firebaseToken')`
- Changed from `Token ${token}` to `Bearer ${token}` format

### 3. Added User Management
- Created API endpoints to manage user roles
- Added `/api/set-teacher-role-api/` endpoint to set teacher roles
- Added `/api/users/` endpoint to list users (admin only)

### 4. Added Management Commands
- Created `set_teacher.py` management command to set users as teachers

## How to Use

### Option 1: Using the Management Command (Recommended)
```bash
cd backend
python manage.py set_teacher your-email@example.com
```

### Option 2: Using the Admin Interface
1. Log in as a super admin user
2. Go to `/homelogin/superadmin`
3. Use the "Set Teacher Role" interface to promote users to teachers

### Option 3: Using the API
```bash
curl -X POST http://localhost:8000/api/set-teacher-role-api/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@example.com"}'
```

## Testing the Fix

1. Start the backend server:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Set a user as a teacher using one of the methods above

4. Log in as that user and try to create a course at `/homelogin/teacher/courses`

## Files Modified

### Backend
- `backend/learning_platform/authentication.py` - New Firebase authentication backend
- `backend/learning_platform/settings.py` - Updated REST framework settings
- `backend/learning_platform/middleware.py` - Fixed user model import
- `backend/learningplatform/views.py` - Added user management views and improved error handling
- `backend/learning_platform/urls.py` - Added new API endpoints
- `backend/api/management/commands/set_teacher.py` - New management command

### Frontend
- `frontend/src/app/homelogin/teacher/courses/page.tsx` - Fixed token handling
- `frontend/src/app/homelogin/superadmin/page.tsx` - Added user management interface

## Troubleshooting

### If you still get "Only teachers can create courses" error:
1. Check that the user has `is_teacher=True` in the Django database
2. Verify the Firebase token is being sent correctly
3. Check the backend logs for authentication errors

### If authentication fails:
1. Ensure Firebase credentials are properly configured
2. Check that the Firebase token is valid
3. Verify the user exists in both Firebase and Django

### To check user roles in Django:
```bash
cd backend
python manage.py shell
```
```python
from api.models import User
user = User.objects.get(email='your-email@example.com')
print(f"is_teacher: {user.is_teacher}")
print(f"is_student: {user.is_student}")
print(f"is_superuser: {user.is_superuser}")
``` 