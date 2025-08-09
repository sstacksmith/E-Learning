from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.

class User(AbstractUser):
    email = models.EmailField(unique=True)
    firebase_uid = models.CharField(max_length=128, blank=True, null=True, unique=True)
    is_student = models.BooleanField(default=True)
    is_teacher = models.BooleanField(default=False)
    is_parent = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def role(self):
        if self.is_superuser:
            return 'admin'
        elif self.is_teacher:
            return 'teacher'
        else:
            return 'student'

    def __str__(self):
        return self.username

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)  # CSS class for icon
    order = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['order', 'name']

class Course(models.Model):
    LEVEL_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    )
    
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    firebase_id = models.CharField(max_length=128, blank=True, null=True, unique=True)  # ID z Firebase
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='courses')
    description = models.TextField()
    thumbnail = models.CharField(max_length=255, blank=True)  # URL to thumbnail image
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    is_featured = models.BooleanField(default=False)
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses_taught')
    students = models.ManyToManyField(User, related_name='courses_enrolled', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

class Module(models.Model):
    title = models.CharField(max_length=200)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['order']

class Lesson(models.Model):
    CONTENT_TYPE_CHOICES = (
        ('video', 'Video'),
        ('text', 'Text'),
        ('quiz', 'Quiz'),
        ('assignment', 'Assignment'),
    )
    
    title = models.CharField(max_length=200)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='text')
    content = models.TextField()  # For text lessons or quiz questions in JSON format
    video_url = models.CharField(max_length=255, blank=True)  # For video lessons
    order = models.IntegerField(default=0)
    duration_minutes = models.IntegerField(default=0)  # Estimated time to complete
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['order']

class UserLearningTime(models.Model):
    """Model do śledzenia ogólnego czasu nauki użytkownika"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_time')
    date = models.DateField(auto_now_add=True)
    time_spent_minutes = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'date']
        verbose_name_plural = "User Learning Time"
    
    def __str__(self):
        return f"{self.user.username} - {self.date}: {self.time_spent_minutes} minutes"

class Progress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    last_viewed = models.DateTimeField(auto_now=True)
    time_spent_minutes = models.IntegerField(default=0)  # Rzeczywisty czas spędzony na nauce
    score = models.FloatField(null=True, blank=True)  # For quizzes and assignments
    
    class Meta:
        unique_together = ['user', 'lesson']
        verbose_name_plural = "Progress"

class ParentStudent(models.Model):
    parent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='students_supervised')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='parent_supervisors')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['parent', 'student']
        verbose_name_plural = "Parent-Student Relationships"

    def __str__(self):
        return f"{self.parent.username} -> {self.student.username}"


class Grade(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grades')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='grades')
    value = models.DecimalField(max_digits=3, decimal_places=1)
    date = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.username} - {self.course.title}: {self.value}"
