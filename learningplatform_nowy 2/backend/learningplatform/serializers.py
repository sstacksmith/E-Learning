from rest_framework import serializers
from .models import Course

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'year_of_study', 'created_by', 'subject', 'pdfUrls', 'links']
        read_only_fields = ['id', 'created_by'] 