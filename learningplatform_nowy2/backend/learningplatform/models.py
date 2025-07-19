from django.db import models
from django.conf import settings

class UserGroup(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_groups')

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=['created_by']),
            models.Index(fields=['created_at']),
        ]

class UserProfile(models.Model):
    USER_TYPES = (
        ('admin', 'Super Administrator'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    )
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    user_type = models.CharField(max_length=10, choices=USER_TYPES)
    year_of_study = models.IntegerField(null=True, blank=True)  # for students
    groups = models.ManyToManyField(UserGroup, blank=True, related_name='members')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.user_type}"

    class Meta:
        indexes = [
            models.Index(fields=['user_type']),
            models.Index(fields=['year_of_study']),
            models.Index(fields=['created_at']),
        ]

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    year_of_study = models.IntegerField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    subject = models.CharField(max_length=100, blank=True)
    pdfUrls = models.JSONField(default=list, blank=True)
    links = models.JSONField(default=list, blank=True)
    slug = models.SlugField(max_length=255, blank=True, unique=True)

    def __str__(self):
        return self.title

    class Meta:
        indexes = [
            models.Index(fields=['created_by']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
            models.Index(fields=['subject']),
            models.Index(fields=['year_of_study']),
            models.Index(fields=['slug']),
        ]
        ordering = ['-created_at']

class CourseAssignment(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments_made')
    assigned_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('course', 'student')
        indexes = [
            models.Index(fields=['course']),
            models.Index(fields=['student']),
            models.Index(fields=['is_active']),
            models.Index(fields=['assigned_date']),
        ]

    def __str__(self):
        return f"{self.student.username} - {self.course.title}" 