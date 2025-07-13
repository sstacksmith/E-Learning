from django.contrib import admin
from .models import UserProfile, UserGroup, Course, CourseAssignment

admin.site.register(UserProfile)
admin.site.register(UserGroup)
admin.site.register(Course)
admin.site.register(CourseAssignment)