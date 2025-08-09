from django.db import models
from django.utils import timezone
from ..models import User, Course, Lesson

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='game_profile')
    level = models.IntegerField(default=1)
    experience = models.IntegerField(default=0)
    total_time_spent = models.DurationField(default=timezone.timedelta)
    avatar_url = models.CharField(max_length=255, blank=True)
    points = models.IntegerField(default=0)
    
    def calculate_level(self):
        # Przykładowy wzór: każdy poziom wymaga o 10% więcej XP niż poprzedni
        base_xp = 1000  # XP wymagane na poziom 1
        current_xp = self.experience
        level = 1
        
        while current_xp >= base_xp:
            current_xp -= base_xp
            level += 1
            base_xp = int(base_xp * 1.1)  # 10% więcej XP na kolejny poziom
        
        return level

    def add_experience(self, amount):
        self.experience += amount
        new_level = self.calculate_level()
        if new_level > self.level:
            # Awans na wyższy poziom
            self.level = new_level
            # Tutaj można dodać logikę przyznawania nagród za nowy poziom
        self.save()

    def __str__(self):
        return f"{self.user.username}'s Profile (Level {self.level})"

class Badge(models.Model):
    CATEGORY_CHOICES = [
        ('login', 'Login Streaks'),
        ('time', 'Time Spent'),
        ('course', 'Course Completion'),
        ('quiz', 'Quiz Performance'),
        ('social', 'Social Interaction'),
        ('special', 'Special Achievements'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon_url = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    required_value = models.IntegerField(help_text="Required value to earn this badge (e.g., days logged in, minutes spent)")
    points_reward = models.IntegerField(default=0)
    xp_reward = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name

class UserBadge(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'badge']

class TimeSpent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, null=True, blank=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateField()
    duration = models.DurationField()
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'course']),
        ]

class CourseProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    completed_lessons = models.ManyToManyField(Lesson)
    progress_percentage = models.FloatField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    last_accessed_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'course']

    def update_progress(self):
        total_lessons = self.course.modules.aggregate(
            total=models.Count('lessons')
        )['total']
        
        completed = self.completed_lessons.count()
        self.progress_percentage = (completed / total_lessons * 100) if total_lessons > 0 else 0
        
        if self.progress_percentage == 100 and not self.completed_at:
            self.completed_at = timezone.now()
        
        self.save()

class LoginStreak(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='login_streak')
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_login_date = models.DateField()
    
    def update_streak(self, login_date):
        if not self.last_login_date:
            self.current_streak = 1
        else:
            delta = login_date - self.last_login_date
            if delta.days == 1:  # Consecutive day
                self.current_streak += 1
            elif delta.days > 1:  # Streak broken
                self.current_streak = 1
        
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        
        self.last_login_date = login_date
        self.save() 