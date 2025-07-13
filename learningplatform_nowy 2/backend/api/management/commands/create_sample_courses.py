from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Category, Course, Module, Lesson
from django.utils.text import slugify

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates sample Khan Academy-like courses in the database'

    def handle(self, *args, **kwargs):
        # First, ensure we have at least one teacher user
        teacher, created = User.objects.get_or_create(
            username='teacher',
            defaults={
                'email': 'teacher@example.com',
                'is_student': False,
                'is_teacher': True
            }
        )
        
        if created:
            teacher.set_password('password123')
            teacher.save()
            self.stdout.write(self.style.SUCCESS('Created teacher user'))
        
        # Create categories
        categories = [
            {
                'name': 'Math',
                'description': 'Mathematics courses from basic arithmetic to advanced calculus',
                'icon': 'fa-square-root-variable'
            },
            {
                'name': 'Science',
                'description': 'Science courses including physics, chemistry, biology and more',
                'icon': 'fa-flask'
            },
            {
                'name': 'Computing',
                'description': 'Computer science, programming, and information technology',
                'icon': 'fa-computer'
            },
            {
                'name': 'Humanities',
                'description': 'Literature, history, arts, and social studies',
                'icon': 'fa-book'
            },
            {
                'name': 'Economics',
                'description': 'Micro and macroeconomics, finance, and business',
                'icon': 'fa-chart-line'
            },
            {
                'name': 'Languages',
                'description': 'Foreign language courses for beginners to advanced',
                'icon': 'fa-language'
            },
        ]
        
        for i, category_data in enumerate(categories):
            category, created = Category.objects.get_or_create(
                name=category_data['name'],
                defaults={
                    'description': category_data['description'],
                    'icon': category_data['icon'],
                    'order': i
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
        
        # Create Math courses
        math_category = Category.objects.get(name='Math')
        
        # Algebra course
        algebra_course, created = Course.objects.get_or_create(
            title='Algebra 1',
            defaults={
                'slug': 'algebra-1',
                'category': math_category,
                'description': 'Learn the fundamentals of algebra including equations, inequalities, functions, and more.',
                'thumbnail': 'https://cdn.kastatic.org/images/khan-logo-dark-background.new.png',
                'level': 'intermediate',
                'is_featured': True,
                'instructor': teacher
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created course: {algebra_course.title}'))
            
            # Create modules for Algebra
            modules = [
                {
                    'title': 'Introduction to Algebra',
                    'description': 'Basic algebraic concepts and notation',
                    'lessons': [
                        {
                            'title': 'What is Algebra?',
                            'content_type': 'video',
                            'content': 'Introduction to the fundamental concepts of algebra and why it matters.',
                            'video_url': 'https://www.youtube.com/embed/NybHckSEQBI',
                            'duration_minutes': 12
                        },
                        {
                            'title': 'Variables and Expressions',
                            'content_type': 'text',
                            'content': 'Variables are symbols used to represent values that can change. Expressions combine variables with numbers and operators like +, -, *, and /.',
                            'duration_minutes': 15
                        },
                        {
                            'title': 'Order of Operations',
                            'content_type': 'video',
                            'content': 'Learn the proper sequence for calculating mathematical expressions: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction.',
                            'video_url': 'https://www.youtube.com/embed/ClYdw4d4OmA',
                            'duration_minutes': 10
                        },
                    ]
                },
                {
                    'title': 'Solving Equations',
                    'description': 'Methods for solving various types of equations',
                    'lessons': [
                        {
                            'title': 'Linear Equations',
                            'content_type': 'video',
                            'content': 'A linear equation is an equation where each term is either a constant or the product of a constant and a single variable raised to the power of 1.',
                            'video_url': 'https://www.youtube.com/embed/bAerID24QJ0',
                            'duration_minutes': 20
                        },
                        {
                            'title': 'Solving One-Step Equations',
                            'content_type': 'text',
                            'content': 'One-step equations can be solved in a single step using addition, subtraction, multiplication, or division.',
                            'duration_minutes': 15
                        },
                        {
                            'title': 'Solving Two-Step Equations',
                            'content_type': 'quiz',
                            'content': '{"questions":[{"question":"Solve for x: 2x + 3 = 11","options":["x = 4","x = 7","x = 14","x = 8"],"answer":0},{"question":"Solve for y: 5y - 10 = 20","options":["y = 6","y = 30","y = 2","y = 10"],"answer":0}]}',
                            'duration_minutes': 25
                        },
                    ]
                },
            ]
            
            for i, module_data in enumerate(modules):
                module = Module.objects.create(
                    title=module_data['title'],
                    course=algebra_course,
                    description=module_data['description'],
                    order=i
                )
                
                for j, lesson_data in enumerate(module_data['lessons']):
                    Lesson.objects.create(
                        title=lesson_data['title'],
                        module=module,
                        content_type=lesson_data['content_type'],
                        content=lesson_data['content'],
                        video_url=lesson_data.get('video_url', ''),
                        order=j,
                        duration_minutes=lesson_data['duration_minutes']
                    )
        
        # Calculus course
        calculus_course, created = Course.objects.get_or_create(
            title='Calculus',
            defaults={
                'slug': 'calculus',
                'category': math_category,
                'description': 'Master the fundamentals of calculus, including derivatives, integrals, and their applications.',
                'thumbnail': 'https://cdn.kastatic.org/images/khan-logo-dark-background.new.png',
                'level': 'advanced',
                'is_featured': True,
                'instructor': teacher
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created course: {calculus_course.title}'))
            
            # Create modules for Calculus
            modules = [
                {
                    'title': 'Limits and Continuity',
                    'description': 'Understanding the foundation of calculus',
                    'lessons': [
                        {
                            'title': 'Introduction to Limits',
                            'content_type': 'video',
                            'content': 'Learn the concept of limits and how they form the foundation for calculus.',
                            'video_url': 'https://www.youtube.com/embed/riXcZT2ICjA',
                            'duration_minutes': 18
                        },
                        {
                            'title': 'Evaluating Limits Algebraically',
                            'content_type': 'text',
                            'content': 'Methods for computing limits using algebraic techniques like factoring and rationalization.',
                            'duration_minutes': 22
                        },
                        {
                            'title': 'Continuity',
                            'content_type': 'video',
                            'content': 'Understand what it means for a function to be continuous and how to identify discontinuities.',
                            'video_url': 'https://www.youtube.com/embed/BzsDDIaYQHQ',
                            'duration_minutes': 15
                        },
                    ]
                },
                {
                    'title': 'Derivatives',
                    'description': 'The core concept of differential calculus',
                    'lessons': [
                        {
                            'title': 'Definition of the Derivative',
                            'content_type': 'video',
                            'content': 'Learn how derivatives represent rates of change and slopes of tangent lines.',
                            'video_url': 'https://www.youtube.com/embed/rAof9Ld5sOg',
                            'duration_minutes': 20
                        },
                        {
                            'title': 'Rules of Differentiation',
                            'content_type': 'text',
                            'content': 'Learn the power rule, product rule, quotient rule, and chain rule for computing derivatives.',
                            'duration_minutes': 30
                        },
                        {
                            'title': 'Applications of Derivatives',
                            'content_type': 'assignment',
                            'content': 'Apply derivatives to solve real-world problems involving rates of change, optimization, and related rates.',
                            'duration_minutes': 45
                        },
                    ]
                },
            ]
            
            for i, module_data in enumerate(modules):
                module = Module.objects.create(
                    title=module_data['title'],
                    course=calculus_course,
                    description=module_data['description'],
                    order=i
                )
                
                for j, lesson_data in enumerate(module_data['lessons']):
                    Lesson.objects.create(
                        title=lesson_data['title'],
                        module=module,
                        content_type=lesson_data['content_type'],
                        content=lesson_data['content'],
                        video_url=lesson_data.get('video_url', ''),
                        order=j,
                        duration_minutes=lesson_data['duration_minutes']
                    )
        
        # Create a Computer Science course
        cs_category = Category.objects.get(name='Computing')
        
        python_course, created = Course.objects.get_or_create(
            title='Python Programming',
            defaults={
                'slug': 'python-programming',
                'category': cs_category,
                'description': 'Learn Python programming from the ground up, covering fundamentals, data structures, and practical applications.',
                'thumbnail': 'https://cdn.kastatic.org/images/khan-logo-dark-background.new.png',
                'level': 'beginner',
                'is_featured': True,
                'instructor': teacher
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created course: {python_course.title}'))
            
            # Create modules for Python Programming
            modules = [
                {
                    'title': 'Getting Started with Python',
                    'description': 'Setting up and learning the basics of Python',
                    'lessons': [
                        {
                            'title': 'Introduction to Python',
                            'content_type': 'video',
                            'content': 'Learn what Python is, its history, and why it\'s one of the most popular programming languages.',
                            'video_url': 'https://www.youtube.com/embed/x7X9w_GIm1s',
                            'duration_minutes': 10
                        },
                        {
                            'title': 'Installing Python and Writing Your First Program',
                            'content_type': 'text',
                            'content': 'Step-by-step guide to installing Python and creating a simple "Hello, World!" program.',
                            'duration_minutes': 15
                        },
                        {
                            'title': 'Variables and Data Types',
                            'content_type': 'video',
                            'content': 'Understand the different data types in Python and how to use variables.',
                            'video_url': 'https://www.youtube.com/embed/KOdfpbnWLVo',
                            'duration_minutes': 18
                        },
                    ]
                },
                {
                    'title': 'Control Flow in Python',
                    'description': 'Learning to control the flow of program execution',
                    'lessons': [
                        {
                            'title': 'Conditional Statements (if, elif, else)',
                            'content_type': 'video',
                            'content': 'Learn how to make decisions in your programs using conditional statements.',
                            'video_url': 'https://www.youtube.com/embed/PqFKRqpHrjw',
                            'duration_minutes': 22
                        },
                        {
                            'title': 'Loops in Python (for and while)',
                            'content_type': 'text',
                            'content': 'Master the concept of loops to repeat actions in your Python programs.',
                            'duration_minutes': 25
                        },
                        {
                            'title': 'Control Flow Practice',
                            'content_type': 'quiz',
                            'content': '{"questions":[{"question":"What will the following code print? for i in range(5):\\n    print(i)","options":["0 1 2 3 4","1 2 3 4 5","0 1 2 3 4 5","Error"],"answer":0},{"question":"Which statement terminates a loop prematurely?","options":["stop","exit","break","end"],"answer":2}]}',
                            'duration_minutes': 20
                        },
                    ]
                },
            ]
            
            for i, module_data in enumerate(modules):
                module = Module.objects.create(
                    title=module_data['title'],
                    course=python_course,
                    description=module_data['description'],
                    order=i
                )
                
                for j, lesson_data in enumerate(module_data['lessons']):
                    Lesson.objects.create(
                        title=lesson_data['title'],
                        module=module,
                        content_type=lesson_data['content_type'],
                        content=lesson_data['content'],
                        video_url=lesson_data.get('video_url', ''),
                        order=j,
                        duration_minutes=lesson_data['duration_minutes']
                    )
        
        # Create a Language course
        lang_category = Category.objects.get(name='Languages')
        
        spanish_course, created = Course.objects.get_or_create(
            title='Spanish 101',
            defaults={
                'slug': 'spanish-101',
                'category': lang_category,
                'description': 'Start your journey learning Spanish with this course for absolute beginners.',
                'thumbnail': 'https://cdn.kastatic.org/images/khan-logo-dark-background.new.png',
                'level': 'beginner',
                'is_featured': False,
                'instructor': teacher
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created course: {spanish_course.title}'))
            
            # Create modules for Spanish 101
            modules = [
                {
                    'title': 'Introduction to Spanish',
                    'description': 'Basic greetings and pronunciation',
                    'lessons': [
                        {
                            'title': 'Spanish Alphabet and Pronunciation',
                            'content_type': 'video',
                            'content': 'Learn how to pronounce Spanish letters and sounds.',
                            'video_url': 'https://www.youtube.com/embed/Y-JVxjBADZ8',
                            'duration_minutes': 15
                        },
                        {
                            'title': 'Greetings and Introductions',
                            'content_type': 'text',
                            'content': 'Learn common Spanish greetings and how to introduce yourself.',
                            'duration_minutes': 20
                        },
                        {
                            'title': 'Numbers and Counting',
                            'content_type': 'video',
                            'content': 'Learn how to count in Spanish and use numbers in conversation.',
                            'video_url': 'https://www.youtube.com/embed/6FEyfy5N3Nc',
                            'duration_minutes': 18
                        },
                    ]
                },
                {
                    'title': 'Basic Conversation',
                    'description': 'Essential vocabulary and sentence structures',
                    'lessons': [
                        {
                            'title': 'Common Phrases and Expressions',
                            'content_type': 'video',
                            'content': 'Learn everyday Spanish phrases you can use immediately.',
                            'video_url': 'https://www.youtube.com/embed/qgoe7kP3kQk',
                            'duration_minutes': 25
                        },
                        {
                            'title': 'Present Tense Verbs',
                            'content_type': 'text',
                            'content': 'Learn how to conjugate regular verbs in the present tense.',
                            'duration_minutes': 30
                        },
                        {
                            'title': 'Basic Vocabulary Quiz',
                            'content_type': 'quiz',
                            'content': '{"questions":[{"question":"What is the Spanish word for \"hello\"?","options":["Adios","Hola","Gracias","Buenos días"],"answer":1},{"question":"How do you say \"thank you\" in Spanish?","options":["Por favor","Lo siento","Gracias","De nada"],"answer":2}]}',
                            'duration_minutes': 15
                        },
                    ]
                },
            ]
            
            for i, module_data in enumerate(modules):
                module = Module.objects.create(
                    title=module_data['title'],
                    course=spanish_course,
                    description=module_data['description'],
                    order=i
                )
                
                for j, lesson_data in enumerate(module_data['lessons']):
                    Lesson.objects.create(
                        title=lesson_data['title'],
                        module=module,
                        content_type=lesson_data['content_type'],
                        content=lesson_data['content'],
                        video_url=lesson_data.get('video_url', ''),
                        order=j,
                        duration_minutes=lesson_data['duration_minutes']
                    )
        
        # Create a Science course
        science_category = Category.objects.get(name='Science')
        
        physics_course, created = Course.objects.get_or_create(
            title='Physics: Mechanics',
            defaults={
                'slug': 'physics-mechanics',
                'category': science_category,
                'description': 'An introduction to classical mechanics, covering motion, forces, energy, and momentum.',
                'thumbnail': 'https://cdn.kastatic.org/images/khan-logo-dark-background.new.png',
                'level': 'intermediate',
                'is_featured': True,
                'instructor': teacher
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created course: {physics_course.title}'))
            
            # Create modules for Physics
            modules = [
                {
                    'title': 'Motion in One Dimension',
                    'description': 'Understanding position, velocity, and acceleration',
                    'lessons': [
                        {
                            'title': 'Position and Displacement',
                            'content_type': 'video',
                            'content': 'Learn the difference between distance and displacement, and how to calculate them.',
                            'video_url': 'https://www.youtube.com/embed/4-yiXB5o1N8',
                            'duration_minutes': 18
                        },
                        {
                            'title': 'Velocity and Speed',
                            'content_type': 'text',
                            'content': 'Understand the concepts of speed vs. velocity and how to calculate average and instantaneous velocity.',
                            'duration_minutes': 22
                        },
                        {
                            'title': 'Acceleration',
                            'content_type': 'video',
                            'content': 'Learn how acceleration measures the rate of change of velocity over time.',
                            'video_url': 'https://www.youtube.com/embed/FOkQszg1-j8',
                            'duration_minutes': 20
                        },
                    ]
                },
                {
                    'title': 'Forces and Newton\'s Laws',
                    'description': 'The fundamental laws governing motion',
                    'lessons': [
                        {
                            'title': 'Newton\'s First Law: Inertia',
                            'content_type': 'video',
                            'content': 'Understand how objects maintain their state of motion unless acted upon by an external force.',
                            'video_url': 'https://www.youtube.com/embed/CQYELiTtUs8',
                            'duration_minutes': 15
                        },
                        {
                            'title': 'Newton\'s Second Law: F=ma',
                            'content_type': 'text',
                            'content': 'Learn how force, mass, and acceleration are related and how to solve problems using F=ma.',
                            'duration_minutes': 25
                        },
                        {
                            'title': 'Newton\'s Laws Quiz',
                            'content_type': 'quiz',
                            'content': '{"questions":[{"question":"A net force of 10 N acts on a 2 kg object. What is its acceleration?","options":["5 m/s²","10 m/s²","20 m/s²","2 m/s²"],"answer":0},{"question":"Which law states that for every action, there is an equal and opposite reaction?","options":["Newton\'s First Law","Newton\'s Second Law","Newton\'s Third Law","The Law of Conservation of Energy"],"answer":2}]}',
                            'duration_minutes': 20
                        },
                    ]
                },
            ]
            
            for i, module_data in enumerate(modules):
                module = Module.objects.create(
                    title=module_data['title'],
                    course=physics_course,
                    description=module_data['description'],
                    order=i
                )
                
                for j, lesson_data in enumerate(module_data['lessons']):
                    Lesson.objects.create(
                        title=lesson_data['title'],
                        module=module,
                        content_type=lesson_data['content_type'],
                        content=lesson_data['content'],
                        video_url=lesson_data.get('video_url', ''),
                        order=j,
                        duration_minutes=lesson_data['duration_minutes']
                    )
        
        self.stdout.write(self.style.SUCCESS('Successfully created sample Khan Academy-like courses')) 