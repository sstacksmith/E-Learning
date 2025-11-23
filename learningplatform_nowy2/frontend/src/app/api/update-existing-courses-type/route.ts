import { NextResponse } from 'next/server';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export async function POST() {
  try {
    console.log('Starting update of existing courses to mandatory type...');
    
    // Get all courses from Firestore
    const coursesCollection = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesCollection);
    
    console.log(`Found ${coursesSnapshot.size} courses to update`);
    
    const updatePromises = [];
    let updatedCount = 0;
    
    for (const courseDoc of coursesSnapshot.docs) {
      const courseData = courseDoc.data();
      
      // Only update courses that don't have courseType field
      if (!courseData.courseType) {
        const courseRef = doc(db, 'courses', courseDoc.id);
        updatePromises.push(
          updateDoc(courseRef, {
            courseType: 'obowiązkowy',
            updated_at: new Date().toISOString()
          })
        );
        updatedCount++;
      }
    }
    
    // Execute all updates
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Successfully updated ${updatedCount} courses to mandatory type`);
    } else {
      console.log('No courses needed updating - all already have courseType field');
    }
    
    return NextResponse.json({
      success: true,
      message: `Zaktualizowano ${updatedCount} kursów jako obowiązkowe`,
      updatedCount,
      totalCourses: coursesSnapshot.size
    });
    
  } catch (error) {
    console.error('Error updating courses:', error);
    return NextResponse.json(
      { error: 'Błąd podczas aktualizacji kursów' },
      { status: 500 }
    );
  }
}
