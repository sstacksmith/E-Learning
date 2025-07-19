#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'learning_platform.settings')
django.setup()

from learningplatform.models import Course
from django.utils.text import slugify
import uuid

def fix_duplicate_slugs():
    """Naprawia duplikaty slug w kursach"""
    print("Naprawianie duplikatów slug...")
    
    # Znajdź kursy z pustymi lub duplikatami slug
    courses_without_slug = Course.objects.filter(slug__isnull=True) | Course.objects.filter(slug='')
    courses_with_duplicates = []
    
    # Sprawdź duplikaty
    seen_slugs = set()
    for course in Course.objects.all():
        if course.slug:
            if course.slug in seen_slugs:
                courses_with_duplicates.append(course)
            else:
                seen_slugs.add(course.slug)
    
    print(f"Znaleziono {courses_without_slug.count()} kursów bez slug")
    print(f"Znaleziono {len(courses_with_duplicates)} kursów z duplikatami slug")
    
    # Napraw kursy bez slug
    for course in courses_without_slug:
        base_slug = slugify(course.title)
        if not base_slug:
            base_slug = f"course-{course.id}"
        
        # Dodaj unikalny identyfikator jeśli slug już istnieje
        unique_slug = base_slug
        counter = 1
        while Course.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{base_slug}-{counter}"
            counter += 1
        
        course.slug = unique_slug
        course.save()
        print(f"Naprawiono slug dla kursu '{course.title}': {unique_slug}")
    
    # Napraw duplikaty
    for course in courses_with_duplicates:
        base_slug = slugify(course.title)
        if not base_slug:
            base_slug = f"course-{course.id}"
        
        # Dodaj unikalny identyfikator
        unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
        while Course.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
        
        course.slug = unique_slug
        course.save()
        print(f"Naprawiono duplikat slug dla kursu '{course.title}': {unique_slug}")
    
    print("Naprawianie slug zakończone!")

if __name__ == '__main__':
    fix_duplicate_slugs() 