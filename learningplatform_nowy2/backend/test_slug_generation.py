
#!/usr/bin/env python
import re
import uuid

def generate_unique_slug(title, existing_slugs=None):
    """Generuje unikalny slug z tytułu (test bez Firebase)"""
    if existing_slugs is None:
        existing_slugs = []
    
    # Generuj bazowy slug
    base_slug = re.sub(r'[^a-z0-9\s-]', '', title.lower()).replace(' ', '-').strip('-')
    if not base_slug:
        base_slug = f"course-{uuid.uuid4().hex[:8]}"
    
    # Sprawdź czy slug już istnieje
    unique_slug = base_slug
    counter = 1
    
    while unique_slug in existing_slugs:
        # Jeśli istnieje, dodaj licznik
        unique_slug = f"{base_slug}-{counter}"
        counter += 1
        
        # Zabezpieczenie przed nieskończoną pętlą
        if counter > 1000:
            unique_slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"
            break
    
    return unique_slug

def test_slug_generation():
    """Test funkcji generowania unikalnych slugów"""
    print("Test generowania unikalnych slugów...")
    
    # Test 1: Podstawowe generowanie
    test_titles = [
        "Matematyka",
        "Matematyka",  # Duplikat
        "Matematyka",  # Kolejny duplikat
        "Fizyka",
        "Chemia",
        "Język Polski",
        "Historia",
        "Geografia",
        "Biologia",
        "Informatyka"
    ]
    
    existing_slugs = []
    generated_slugs = []
    
    print("\n=== TEST GENEROWANIA SLUGÓW ===")
    for i, title in enumerate(test_titles, 1):
        slug = generate_unique_slug(title, existing_slugs)
        existing_slugs.append(slug)
        generated_slugs.append(slug)
        print(f"{i:2d}. '{title}' -> '{slug}'")
    
    print(f"\nWygenerowano {len(generated_slugs)} unikalnych slugów")
    print(f"Unikalność: {len(set(generated_slugs)) == len(generated_slugs)}")
    
    # Test 2: Sprawdź duplikaty
    duplicates = []
    seen = set()
    for slug in generated_slugs:
        if slug in seen:
            duplicates.append(slug)
        else:
            seen.add(slug)
    
    if duplicates:
        print(f"❌ Znaleziono duplikaty: {duplicates}")
    else:
        print("✅ Wszystkie slugi są unikalne!")
    
    # Test 3: Sprawdź format slugów
    print("\n=== TEST FORMATU SLUGÓW ===")
    for slug in generated_slugs:
        # Sprawdź czy slug zawiera tylko dozwolone znaki
        if re.match(r'^[a-z0-9-]+$', slug):
            print(f"✅ '{slug}' - poprawny format")
        else:
            print(f"❌ '{slug}' - niepoprawny format")
    
    return generated_slugs

if __name__ == '__main__':
    test_slug_generation()
