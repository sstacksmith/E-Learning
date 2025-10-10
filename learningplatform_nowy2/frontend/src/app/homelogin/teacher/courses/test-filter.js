// Test funkcji filtrowania kursów
// Uruchom w konsoli przeglądarki na stronie kursów nauczyciela

function testFilterCourses() {
  console.log('🧪 [TEST] Starting course filter tests...');
  
  // Test data
  const testCourses = [
    {
      id: '1',
      title: 'Matematyka podstawowa',
      courseType: 'obowiązkowy',
      description: 'Podstawy matematyki',
      subject: 'Matematyka',
      year_of_study: 1
    },
    {
      id: '2', 
      title: 'Programowanie Python',
      courseType: 'fakultatywny',
      description: 'Nauka programowania w Pythonie',
      subject: 'Informatyka',
      year_of_study: 2
    },
    {
      id: '3',
      title: 'Historia Polski',
      courseType: 'obowiązkowy', 
      description: 'Historia Polski od średniowiecza',
      subject: 'Historia',
      year_of_study: 1
    },
    {
      id: '4',
      title: 'Kurs bez typu',
      // courseType: undefined - test dla domyślnej wartości
      description: 'Kurs bez ustawionego typu',
      subject: 'Test',
      year_of_study: 1
    }
  ];
  
  // Test funkcji filtrowania (kopiowana z komponentu)
  const filterCourses = (courses, search, typeFilter) => {
    console.log('🔍 [TEST] filterCourses called with:', {
      totalCourses: courses.length,
      search,
      typeFilter,
      coursesData: courses.map(c => ({
        id: c.id,
        title: c.title,
        courseType: c.courseType,
        hasCourseType: !!c.courseType
      }))
    });
    
    let filtered = courses;
    
    // Filtrowanie według typu kursu
    if (typeFilter !== 'wszystkie') {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(course => {
        const courseType = course.courseType || 'obowiązkowy';
        const matches = courseType === typeFilter;
        console.log(`🔍 [TEST] Course "${course.title}" - courseType: "${courseType}", filter: "${typeFilter}", matches: ${matches}`);
        return matches;
      });
      console.log(`🔍 [TEST] Type filter "${typeFilter}": ${beforeFilter} -> ${filtered.length} courses`);
    }
    
    // Filtrowanie według wyszukiwania
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      const beforeSearch = filtered.length;
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchLower) ||
        course.description.toLowerCase().includes(searchLower) ||
        course.subject.toLowerCase().includes(searchLower) ||
        course.year_of_study.toString().includes(searchLower)
      );
      console.log(`🔍 [TEST] Search "${search}": ${beforeSearch} -> ${filtered.length} courses`);
    }
    
    console.log('🔍 [TEST] Final filtered courses:', filtered.map(c => ({
      id: c.id,
      title: c.title,
      courseType: c.courseType || 'obowiązkowy'
    })));
    
    return filtered;
  };
  
  // Testy
  console.log('\n🧪 [TEST] Test 1: Wszystkie kursy');
  const allCourses = filterCourses(testCourses, '', 'wszystkie');
  console.log(`✅ Oczekiwane: 4, Otrzymane: ${allCourses.length}`);
  
  console.log('\n🧪 [TEST] Test 2: Tylko obowiązkowe');
  const mandatoryCourses = filterCourses(testCourses, '', 'obowiązkowy');
  console.log(`✅ Oczekiwane: 3 (Matematyka, Historia, Kurs bez typu), Otrzymane: ${mandatoryCourses.length}`);
  console.log('Kursy:', mandatoryCourses.map(c => c.title));
  
  console.log('\n🧪 [TEST] Test 3: Tylko fakultatywne');
  const optionalCourses = filterCourses(testCourses, '', 'fakultatywny');
  console.log(`✅ Oczekiwane: 1 (Programowanie Python), Otrzymane: ${optionalCourses.length}`);
  console.log('Kursy:', optionalCourses.map(c => c.title));
  
  console.log('\n🧪 [TEST] Test 4: Wyszukiwanie + filtrowanie');
  const searchAndFilter = filterCourses(testCourses, 'python', 'fakultatywny');
  console.log(`✅ Oczekiwane: 1 (Programowanie Python), Otrzymane: ${searchAndFilter.length}`);
  console.log('Kursy:', searchAndFilter.map(c => c.title));
  
  console.log('\n🧪 [TEST] Test 5: Wyszukiwanie bez filtrowania typu');
  const searchOnly = filterCourses(testCourses, 'matematyka', 'wszystkie');
  console.log(`✅ Oczekiwane: 1 (Matematyka podstawowa), Otrzymane: ${searchOnly.length}`);
  console.log('Kursy:', searchOnly.map(c => c.title));
  
  console.log('\n🎉 [TEST] Wszystkie testy zakończone!');
}

// Uruchom testy
testFilterCourses();
