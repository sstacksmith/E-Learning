from rest_framework import serializers
from .models import Course

from django.utils.text import slugify

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'year_of_study', 'created_by', 'subject', 'pdfUrls', 'links', 'slug']
        read_only_fields = ['id', 'created_by', 'slug']
    
    def create(self, validated_data):
        # Automatycznie generuj slug z tytułu
        title = validated_data.get('title', '')
        if title:
            base_slug = slugify(title)
            slug = base_slug
            counter = 1
            # Sprawdź czy slug już istnieje, jeśli tak dodaj licznik
            while Course.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data) 